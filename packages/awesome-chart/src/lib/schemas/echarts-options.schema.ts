export const echartsOptionsSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "EChartsOptions",
  description: "Simplified schema for validating ECharts option objects",
  type: "object",

  // ✅ السماح بخصائص إضافية (عشان ECharts مرن جدًا)
  additionalProperties: true,

  properties: {
    title: {
      type: "object",
      additionalProperties: true,
      properties: {
        text: { type: "string" },
        subtext: { type: "string" },
        left: { type: "string" },
        top: { type: "string" }
      }
    },
    tooltip: {
      type: "object",
      additionalProperties: true
    },
    legend: {
      type: "object",
      additionalProperties: true
    },
    xAxis: {
      type: ["object", "array"], // ممكن يكون single أو multiple axes
      additionalProperties: true
    },
    yAxis: {
      type: ["object", "array"],
      additionalProperties: true
    },
    grid: {
      type: "object",
      additionalProperties: true
    },
    color: {
      type: "array",
      items: { type: "string" }
    },
    backgroundColor: { type: "string" },
    dataset: {
      type: "object",
      additionalProperties: true
    },
    series: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          type: { type: "string" },
          name: { type: "string" },
          data: {
            type: "array",
            items: {}
          },
          encode: { type: "object" },
          emphasis: { type: "object" }
        },
        required: ["type"]
      }
    }
  },

  // ✅ مش ضروري نطلب title أو series بشكل إجباري
  required: ["series"]
};
