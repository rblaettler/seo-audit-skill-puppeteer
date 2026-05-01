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
