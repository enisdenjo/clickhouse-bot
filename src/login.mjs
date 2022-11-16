import pptr from 'puppeteer';
import { isDev } from './index.mjs';

/**
 * @param {string} username
 * @param {string} password
 * @return {Promise<string>} The JWT access token acquired after logging it.
 */
export async function login(username, password) {
  console.info('Logging in to ClickHouse', {
    username,
    password: '<omitted>',
  });

  const browser = await pptr.launch({
    headless: !isDev,
    devtools: isDev,
  });
  const page = await browser.newPage();

  await page.goto('https://clickhouse.cloud/signin');

  await page.type('input[name=email]', username);
  await page.type('input[name=password]', password);
  await page.click('button[type=submit]');

  let accessToken = '';

  // there will be multiple AWS Cognito requests, one of them must have the access token
  while (!accessToken) {
    const res = await page.waitForResponse(
      'https://cognito-idp.us-east-2.amazonaws.com/',
    );

    if (res.headers()['content-type'] === 'application/x-amz-json-1.1') {
      const body = await res.json();
      const tentativeAccessToken = body.AuthenticationResult?.AccessToken;
      if (typeof tentativeAccessToken === 'string') {
        accessToken = tentativeAccessToken;
      }
    }
  }

  await browser.close();

  return accessToken;
}
