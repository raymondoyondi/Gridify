import { describe, it, expect } from "vitest";
import { tableFromArrays } from "apache-arrow";
import { tableToSeries, tableToDevices } from "./arrowClient";

describe("arrowClient columnar parsing", () => {
  it("converts a (label, value) table into chart arrays", () => {
    const table = tableFromArrays({
      label: ["Jan", "Feb", "Mar"],
      value: [15, 20, 16],
    });
    const series = tableToSeries(table);
    expect(series.labels).toEqual(["Jan", "Feb", "Mar"]);
    expect(series.values).toEqual([15, 20, 16]);
  });

  it("coerces NaN / missing values to 0", () => {
    const table = tableFromArrays({
      label: ["a", "b", "c", "d"],
      value: [1, NaN, null, 4],
    });
    const series = tableToSeries(table);
    expect(series.values).toEqual([1, 0, 0, 4]);
  });

  it("reconstructs structured device records", () => {
    const table = tableFromArrays({
      id: ["Device 01", "Device 02"],
      score: [28.78, 27.53],
      uptime: [88, 93],
      load: ["2.3K", "6.7K"],
      status: ["operational", "alert"],
      type: ["Host", "Node"],
      active: [true, false],
    });
    const devices = tableToDevices(table);
    expect(devices).toHaveLength(2);
    expect(devices[0].id).toBe("Device 01");
    expect(devices[1].active).toBe(false);
    expect(devices[0].score).toBeCloseTo(28.78);
  });
});
