import {
  CookieJar,
  wrapFetch,
} from "https://deno.land/x/another_cookiejar@v5.0.3/mod.ts";

export class subjectURL {
  /** test subject base url */
  public static base = "https://d.systemdynamics.tw/blackbox.php" as const;

  /** reset action */
  public static reset = function () {
    const url = new URL(subjectURL.base);
    url.searchParams.append("act", "reset");
    return url;
  }();

  /** getTotal action */
  public static getTotal = function () {
    const url = new URL(subjectURL.base);
    url.searchParams.append("act", "getTotal");
    return url;
  }();

  /** getDiscount action */
  public static getDiscount = function () {
    const url = new URL(subjectURL.base);
    url.searchParams.append("act", "getDiscount");
    return url;
  }();

  /** addItem action */
  public static addItem = function (name: string, price: number | string) {
    const url = new URL(subjectURL.base);
    url.searchParams.append("act", "addItem");
    url.searchParams.append("name", name);
    url.searchParams.append("price", price.toString());
    return url;
  };
}

export async function createSession(
  url: URL | string,
  cookie: CookieJar | undefined = undefined,
) {
  if (cookie === undefined) {
    cookie = new CookieJar();
  }
  (await fetchHelper(url, cookie)).body?.cancel();

  return cookie;
}

export function fetchHelper(
  url: URL | string,
  cookie: CookieJar,
  init: RequestInit | undefined = undefined,
): Promise<Response> {
  return wrapFetch({ cookieJar: cookie })(url, init);
}
