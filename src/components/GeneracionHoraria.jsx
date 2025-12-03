// src/components/GeneracionHoraria.jsx
import Highcharts from '../lib/highcharts-config';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { useGeneracionHorariaPromedio } from '../services/graficasService';
import ChartLoadingState from './charts/ChartLoadingState';
import ChartErrorState from './charts/ChartErrorState';
import { getColorForTechnology } from '../lib/chart-colors';
import { areaTooltipFormatter } from '../lib/chart-tooltips';
import Card from './ui/Card';
import tokens from '../styles/theme.js';

const fmt = (v, dec = 2) => Highcharts.numberFormat(v, dec, ',', '.');
const SCALE = 1000;

function stackedMax(series, len) {
  let max = 0;
  for (let i = 0; i < len; i++) {
    const sum = series.reduce((s, srs) => s + (srs.data[i] || 0), 0);
    if (sum > max) max = sum;
  }
  return max;
}

export function GeneracionHoraria() {
  // Prepara payloads
  const payload1 = { fecha_inicio: '2022-01-01', fecha_fin: '2024-06-30', meses: 2 };
  const hoy = new Date();
  const fecha_fin2 = hoy.toISOString().slice(0,10);
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth()-5,1).toISOString().slice(0,10);
  const payload2 = { fecha_inicio: inicio, fecha_fin: fecha_fin2, meses: 2 };

  // Fetch paralelo con React Query
  const query1 = useGeneracionHorariaPromedio(payload1);
  const query2 = useGeneracionHorariaPromedio(payload2);

  const loading = query1.isLoading || query2.isLoading;
  const error = query1.error || query2.error;
  const data1 = query1.data;
  const data2 = query2.data;

  const { opts1, opts2 } = useMemo(() => {
    if (!data1 || !data2) return { opts1: null, opts2: null };

    const horas1 = data1.map(d => d.hora);
    const horas2 = data2.map(d => d.hora);
    const toMW = arr => arr.map(v => v * SCALE);

    const series1 = [
      { name:'TÉRMICA',     data: toMW(data1.map(d=>d.TERMICA)),     color: getColorForTechnology('TERMICA') },
      { name:'COGENERADOR', data: toMW(data1.map(d=>d.COGENERADOR)), color: getColorForTechnology('COGENERADOR') },
      { name:'HIDRÁULICA',  data: toMW(data1.map(d=>d.HIDRAULICA)),  color: getColorForTechnology('HIDRAULICA') },
      { name:'SOLAR',       data: toMW(data1.map(d=>d.SOLAR)),       color: getColorForTechnology('SOLAR') }
    ];
    const max1 = Math.ceil(stackedMax(series1, horas1.length)*1.1);

    const baseOptions = {
      chart: { type: 'area', height: 500 },
      title: { text:'Curva de generación primer semestre 2023' },
      xAxis: {
        categories: horas1, tickInterval:1,
        title: { text: 'Hora del día', style: { color: tokens.colors.text.secondary } },
        labels: { style: { color: tokens.colors.text.secondary } },
        gridLineColor: tokens.colors.border.subtle
      },
      yAxis: {
        min:0, max:max1, tickInterval:Math.ceil(max1/5),
        title: { text: 'Generación (MW/h)', style: { color: tokens.colors.text.secondary } },
        labels: {
          style: { color: tokens.colors.text.secondary },
          formatter() { return fmt(this.value, 0); }
        },
        gridLineColor: tokens.colors.border.subtle
      },
      tooltip: { shared: true, useHTML: true, formatter: areaTooltipFormatter({ unit: 'MW/h', headerFormat: 'Hora: {x}' }) },
      plotOptions:{ area:{ stacking:'normal', lineWidth:1, marker:{enabled:false} } },
      series: series1,
      responsive:{ rules:[{ condition:{maxWidth:600}, chartOptions:{ legend:{layout:'horizontal',align:'center',verticalAlign:'bottom'} } }] }
    };

    const series2 = [
      { name:'TÉRMICA',     data: toMW(data2.map(d=>d.TERMICA)),     color: getColorForTechnology('TERMICA') },
      { name:'COGENERADOR', data: toMW(data2.map(d=>d.COGENERADOR)), color: getColorForTechnology('COGENERADOR') },
      { name:'HIDRÁULICA',  data: toMW(data2.map(d=>d.HIDRAULICA)),  color: getColorForTechnology('HIDRAULICA') },
      { name:'EÓLICA',      data: toMW(data2.map(d=>d.EOLICA)),      color: getColorForTechnology('EOLICA') },
      { name:'SOLAR',       data: toMW(data2.map(d=>d.SOLAR)),       color: getColorForTechnology('SOLAR') }
    ];
    const max2 = Math.ceil(stackedMax(series2, horas2.length)*1.1);

    const variantOptions = {
      ...baseOptions,
      title: { text:'Curva de generación últimos 6 meses' },
      xAxis: { ...baseOptions.xAxis, categories: horas2 },
      yAxis: { ...baseOptions.yAxis, max: max2, tickInterval: Math.ceil(max2/5) },
      series: series2
    };

    return { opts1: baseOptions, opts2: variantOptions };
  }, [data1, data2]);

  if (loading) {
    return <ChartLoadingState message="Cargando gráfica..." />;
  }
  
  if (error) {
    return <ChartErrorState error={error} />;
  }

  if (!opts1 || !opts2) return null;

  return (
    <section className="mt-8">
      <h2 className="text-2xl text-text-primary font-semibold mb-4">
        Curva de generación horaria promedio
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <HighchartsReact highcharts={Highcharts} options={opts1} />
        </Card>
        <Card className="p-4">
          <HighchartsReact highcharts={Highcharts} options={opts2} />
        </Card>
      </div>
    </section>
  );
}

export default GeneracionHoraria;
