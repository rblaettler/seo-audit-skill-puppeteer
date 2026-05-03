import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type { CoreWebVitals } from '../types.js';

let browserPromise: Promise<Browser> | null = null;

export async function initBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ];

      // Try system Chrome first (local dev — no binary download needed)
      try {
        return await puppeteer.launch({ channel: 'chrome', headless: true, args: baseArgs });
      } catch {
        // System Chrome not available, fall through to @sparticuz/chromium
      }

      // Fall back to @sparticuz/chromium (Vercel / Lambda serverless)
      return puppeteer.launch({
        args: [...chromium.args, ...baseArgs],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    })();
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

export interface BrowserFetchResult {
  /** Raw HTML content after JS execution */
  html: string;
  /** HTTP status code */
  statusCode: number;
  /** Response time in milliseconds (until load event) */
  responseTime: number;
  /** Core Web Vitals metrics */
  cwv: CoreWebVitals;
}

export async function fetchPageWithPuppeteer(
  url: string,
  timeout = 30000
): Promise<BrowserFetchResult> {
  const browser = await initBrowser();
  const page = await browser.newPage();

  try {
    const startTime = performance.now();

    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout,
    });

    const loadTime = performance.now() - startTime;

    // Wait a bit more for any dynamic content
    await new Promise<void>(resolve => setTimeout(resolve, 1000));

    const html = await page.content();
    const cwv = await measureCoreWebVitals(page);

    // Measure INP via synthetic interactions
    const { inp, inpSynthetic } = await measureINPWithInteractions(page);
    if (inp !== undefined) cwv.inp = inp;
    cwv.inpSynthetic = inpSynthetic;

    return {
      html,
      statusCode: response?.status() ?? 0,
      responseTime: Math.round(loadTime),
      cwv,
    };
  } finally {
    await page.close();
  }
}

async function measureINPWithInteractions(
  page: Page
): Promise<{ inp: number | undefined; inpSynthetic: boolean }> {
  // Set up INP PerformanceObserver and prevent link/form navigation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.evaluate((): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__INP_INTERACTIONS = [];

    try {
      const observer = new PerformanceObserver((list) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        for (const entry of list.getEntries()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dur: number = (entry as any).duration ?? 0;
          if (dur >= 40) {
            (win.__INP_INTERACTIONS = win.__INP_INTERACTIONS ?? []).push(dur);
          }
        }
        const interactions: number[] = win.__INP_INTERACTIONS ?? [];
        if (interactions.length > 0) {
          const sorted = [...interactions].sort((a, b) => a - b);
          const idx = Math.max(0, Math.ceil(sorted.length * 0.98) - 1);
          win.__INP_VALUE = Math.round(sorted[idx]);
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      observer.observe({ type: 'event', buffered: true } as any);
    } catch {
      // 'event' PerformanceObserver not supported in this browser
    }

    // Prevent link navigation during synthetic clicks
    document.addEventListener('click', (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a');
      if (link) {
        const href = link.getAttribute('href') ?? '';
        if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          e.preventDefault();
        }
      }
    }, true);

    // Prevent form submission during synthetic clicks
    document.addEventListener('submit', (e: Event) => {
      e.preventDefault();
    }, true);
  });

  // Find visible, in-viewport interactive elements (exclude links to avoid navigation)
  const coords = await page.evaluate((): Array<{ x: number; y: number }> => {
    const selectors = [
      'button:not([disabled])',
      '[role="button"]',
      '[role="tab"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'input[type="text"]',
      'input[type="search"]',
      'select',
      'textarea',
      '[onclick]:not(a)',
    ];

    const results: Array<{ x: number; y: number }> = [];
    const seen = new WeakSet<Element>();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    for (const sel of selectors) {
      if (results.length >= 5) break;
      let els: NodeListOf<Element>;
      try {
        els = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of Array.from(els)) {
        if (results.length >= 5) break;
        if (seen.has(el)) continue;
        seen.add(el);

        const rect = el.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= vh &&
          rect.right <= vw
        ) {
          results.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }
    }

    return results;
  });

  if (coords.length === 0) {
    return { inp: undefined, inpSynthetic: true };
  }

  // Simulate clicks with realistic delays
  for (const { x, y } of coords) {
    try {
      await page.mouse.click(x, y, { delay: 50 });
    } catch {
      // Element may have been removed or page state changed
    }
    await new Promise<void>(resolve => setTimeout(resolve, 200));
  }

  // Wait for browser to settle and INP observer to flush
  await new Promise<void>(resolve => setTimeout(resolve, 500));

  // Read measured INP value from browser context
  const inp = await page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .evaluate((): number | undefined => (window as any).__INP_VALUE)
    .catch(() => undefined);

  return { inp, inpSynthetic: true };
}

export async function measureCoreWebVitals(page: Page): Promise<CoreWebVitals> {
  const cwv = await page.evaluate((): Promise<CoreWebVitals> => {
    return new Promise<CoreWebVitals>((resolve) => {
      const metrics: CoreWebVitals = {};

      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navEntry) {
        metrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      }

      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = Math.round(entry.startTime);
        }
      }

      let lcpValue: number | undefined;
      let lcpObserver: PerformanceObserver | undefined;
      try {
        lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            lcpValue = Math.round(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // LCP observer not supported
      }

      let clsValue = 0;
      let clsObserver: PerformanceObserver | undefined;
      try {
        clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error - LayoutShift type not in standard types
            if (!entry.hadRecentInput) {
              // @ts-expect-error - LayoutShift type not in standard types
              clsValue += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // CLS observer not supported
      }

      setTimeout(() => {
        lcpObserver?.disconnect();
        clsObserver?.disconnect();

        if (lcpValue !== undefined) {
          metrics.lcp = lcpValue;
        }
        metrics.cls = Math.round(clsValue * 1000) / 1000;

        resolve(metrics);
      }, 1000);
    });
  });

  return cwv;
}

export async function getBrowser(): Promise<Browser | null> {
  return browserPromise ? browserPromise : null;
}
