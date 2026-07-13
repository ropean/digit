import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

// Tree-shaken registration: only the chart type / components / renderer this
// app actually uses (a single line chart). Importing the full "echarts"
// package instead pulls in every chart type, both renderers, and every
// component, which was the single biggest contributor to report size and
// load time.
echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

interface Props {
  option: EChartsOption;
  height?: number;
  // Accepted for API symmetry with callers that already compute it for
  // their own option colors; the chart instance itself doesn't need a
  // named echarts theme since every color in `option` is set explicitly.
  dark?: boolean;
}

export function EChart({ option, height = 320 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
