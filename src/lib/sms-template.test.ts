import { describe, expect, it } from "vitest";
import { orderSmsVars, renderSmsTemplate } from "./sms-template";

const order = {
  customer_name: "শাহরিয়ার",
  order_number: "PS-03",
  total: 1850,
  customer_phone: "01712346863",
  address_line: "House 5, Road 2",
  upazila: "Mirpur",
  district: "Dhaka",
  order_items: [
    { product_name: "Panjabi", variant_label: "M", quantity: 2 },
    { product_name: "Pajama", variant_label: null, quantity: 1 },
  ],
};

describe("order SMS variables", () => {
  it("fills {{items}} with every product, variant and quantity", () => {
    expect(renderSmsTemplate("{{items}}", orderSmsVars(order))).toBe("Panjabi (M) x2, Pajama x1");
  });

  it("fills {{address}} from address, upazila and district", () => {
    expect(renderSmsTemplate("{{address}}", orderSmsVars(order))).toBe(
      "House 5, Road 2, Mirpur, Dhaka",
    );
  });
});
