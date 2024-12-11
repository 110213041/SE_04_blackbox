import {
  assertEquals,
  // assertLess,
  assertGreaterOrEqual,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import { createSession, fetchHelper, subjectURL } from "./helper.ts";

Deno.test("Basic Testing", async (t) => {
  await t.step("Test action getTotal", async () => {
    const session = await createSession(subjectURL.base);

    const resp = await fetchHelper(subjectURL.getTotal, session);
    const respText = await resp.text();

    assertEquals(respText, "0");
  });

  await t.step("Test action addItem", async () => {
    const session = await createSession(subjectURL.base);

    let resp;

    resp = await fetchHelper(subjectURL.addItem("foo", 50), session, {
      method: "POST",
    });
    await resp.body?.cancel();

    resp = await fetchHelper(subjectURL.getTotal, session);
    const respText = await resp.text();

    assertEquals(respText, "50");
  });

  await t.step("Test action discount", async () => {
    const session = await createSession(subjectURL.base);

    let resp;

    resp = await fetchHelper(subjectURL.addItem("foo", 1000), session, {
      method: "POST",
    });
    await resp.body?.cancel();

    resp = await fetchHelper(subjectURL.getDiscount, session);
    const respText = await resp.text();

    assertEquals(respText, "100");
  });

  await t.step("Test action reset", async () => {
    const session = await createSession(subjectURL.base);

    let resp;
    let respText;

    resp = await fetchHelper(subjectURL.addItem("foo", 1000), session, {
      method: "POST",
    });
    await resp.body?.cancel();

    resp = await fetchHelper(subjectURL.getTotal, session);
    respText = await resp.text();
    assertEquals(respText, "1000");

    resp = await fetchHelper(subjectURL.reset, session);
    await resp.body?.cancel();

    resp = await fetchHelper(subjectURL.getTotal, session);
    respText = await resp.text();
    assertEquals(respText, "0");
  });
});

Deno.test("AddItem Edge Case", async (t) => {
  await t.step("Prevent negative price", async (t) => {
    await t.step("One item negative price", async () => {
      const session = await createSession(subjectURL.base);

      await (await fetchHelper(subjectURL.addItem("foo", -1), session, {
        method: "POST",
      })).body?.cancel();

      const resp = await fetchHelper(subjectURL.getTotal, session);
      const respText = await resp.text();

      assertGreaterOrEqual(respText, "0");
    });

    await t.step("Negative arithmetic", async () => {
      const session = await createSession(subjectURL.base);

      await (await fetchHelper(subjectURL.addItem("foo", 50), session, {
        method: "POST",
      })).body?.cancel();

      await (await fetchHelper(subjectURL.addItem("foo", -500), session, {
        method: "POST",
      })).body?.cancel();

      const resp = await fetchHelper(subjectURL.getTotal, session);
      const respText = await resp.text();

      assertGreaterOrEqual(respText, "50");
    });
  });

  await t.step("Edge Value Check", async (t) => {
    const template = async (value: number) => {
      const session = await createSession(subjectURL.base);

      await (await fetchHelper(subjectURL.addItem("foo", value), session, {
        method: "POST",
      })).body?.cancel();

      const resp = await fetchHelper(subjectURL.getTotal, session);
      const respText = await resp.text();

      assertEquals(respText, value.toString());
    };

    const testValue = [
      0,
      1,
      2 ** 31 - 1, // max int32
      2 ** 32 - 1, // max unsigned int32
      2 ** 63 - 1, // max int64
      2 ** 64 - 1, // max unsigned int64
      25000,
      25001,
    ];

    for (const value of testValue) {
      await t.step(`Value: ${value}`, () => template(value));
    }
  });
});

Deno.test({
  name: "Discount Edge Case",
  async fn(t) {
    type testCase_t = { price: number; discount: number };

    const template = async (currentCase: testCase_t) => {
      const session = await createSession(subjectURL.base);

      await (await fetchHelper(
        subjectURL.addItem("foo", currentCase.price),
        session,
        {
          method: "POST",
        },
      )).body?.cancel();

      const resp = await fetchHelper(subjectURL.getDiscount, session);
      const respText = await resp.text();

      assertEquals(respText, currentCase.discount.toString());
    };

    await t.step("Normal Case (Under 5k)", async (t) => {
      const testCase: Array<testCase_t> = [
        { price: 999, discount: 0 },
        { price: 1000, discount: 100 },
        { price: 1001, discount: 100 },
        { price: 2000, discount: 200 },
        { price: 4999, discount: 400 },
        { price: 5000, discount: 500 },
      ];

      await Promise.all(
        testCase.map((v) =>
          t.step(
            `Price: ${v.price}, Discount: ${v.discount}`,
            () => template(v),
          )
        ),
      );
    });

    await t.step("Bonus Case", async (t) => {
      const testCase: Array<testCase_t> = [
        { price: 5001, discount: 600 },
        { price: 10000, discount: 1100 },
        { price: 10001, discount: 1100 },
        { price: 15000, discount: 1600 },
        { price: 15001, discount: 1600 },
        { price: 25000, discount: 2600 },
      ];

      await Promise.all(
        testCase.map((v) =>
          t.step(
            `Price: ${v.price}, Discount: ${v.discount}`,
            () => template(v),
          )
        ),
      );
    });

    await t.step("Extreme Value", async (t) => {
      const testCase: Array<testCase_t> = [
        {
          price: (1_000_000 - 1000) / 2, // exclude bonus
          discount: 10_000,
        },
        {
          price: (1_001_000 - 1000) / 2, // exclude bonus
          discount: 10_000,
        },
        {
          price: (1_002_000 - 1000) / 2, // exclude bonus
          discount: 10_000,
        },
      ];

      await Promise.all(
        testCase.map((v) =>
          t.step(
            `Price: ${v.price}, Discount: ${v.discount}`,
            () => template(v),
          )
        ),
      );
    });
  },
  sanitizeResources: false,
  sanitizeOps: false,
  sanitizeExit: false,
});
