// src/pages/Hidrologia.jsx

import bannerHidrologia from '../assets/bannerHidrologia.png';
import { SideInfoHidrologia } from "../components/SideInfoHidrologia";
import { HelpCircle, Map as MapIcon, Bolt } from 'lucide-react';
import {
  Banner,
  BannerAction,
  BannerBackground,
  BannerHeader,
  BannerTitle
} from '../components/ui/Banner';

import Highcharts from '../lib/highcharts-config';
import HighchartsReact from 'highcharts-react-official';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

// HTML embebidos
import AutogeneracionIcon from '../assets/svg-icons/Autogeneracion-On.svg';
import GeneracionTermicaIcon from '../assets/svg-icons/GeneracionTermica-On.svg';
import hidrologiaIcon from '../assets/svg-icons/Hidrologia-On.svg';
import OfertaDemandaIcon from '../assets/svg-icons/OfertaDemanda-On.svg';
import arrowUpDarkmodeAmarilloIcon from '../assets/svg-icons/arrowUpDarkmodeAmarillo.svg';
import arrowsDarkmodeAmarilloIcon from '../assets/svg-icons/arrowsDarkmodeAmarillo.svg';
import chart1Html from '../data/Chart1.html?raw';
import chart3Html from '../data/Chart3.html?raw';
import tablaHidrologiaCompleta from '../data/tabla_hidrologia-completa.html?raw';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


import { DamMap } from '../components/DamMap';
import tokens from '../styles/theme.js';

// ===== Paleta =====
const COLORS = {
  down: tokens.colors.status.negative,
  up: tokens.colors.status.positive,
  blue: tokens.colors.status.info,
  gray: tokens.colors.text.secondary,
  yellow: tokens.colors.accent.primary,
  chipText: tokens.colors.text.inverse,
  darkBg: tokens.colors.surface.primary,
  darkBg2: tokens.colors.surface.secondary,
  border: tokens.colors.border.subtle,
};

// ===== Endpoints =====

import TooltipModal from '../components/ui/TooltipModal';
import { useTooltips } from '../services/tooltipsService';
import {
  useHidrologiaConsolidado,
  useHidrologiaEmbalses,
  useHidrologiaAportes,
  useHidrologiaHidraulicos,
  useHidrologiaGeneracion,
  useHidrologiaPrecios
} from '../services/indicadoresService';
import { useGraficaAportes, useGraficaEstatuto } from '../services/graficasService';


// ────────────────────────────────────────────────
// Mapeo Canónico para Tooltip
// ────────────────────────────────────────────────
const TOOLTIP_IDENTIFIERS_MAP = {
  
 

  hidro_card_embalse_dia: 'hidro_card_embalse_dia',
  hidro_card_embalse_porcentaje: 'hidro_card_embalse_porcentaje',
  hidro_card_aporte_mensuales_dia: 'hidro_card_aporte_mensuales_dia',
  hidro_card_aporte_mensuales_porcentaje: 'hidro_card_aporte_mensuales_porcentaje',
  hidro_card_generacion_hidrica: 'hidro_card_generacion_hidrica',
  hidro_card_generacion_termica: 'hidro_card_generacion_termica',
  hidro_card_generacion_fncer: 'hidro_card_generacion_fncer',
  hidro_card_generacion_demanda_real: 'hidro_card_generacion_demanda_real',
  hidro_card_minimo_diario: 'hidro_card_minimo_diario',
  hidro_card_promedio_diario: 'hidro_card_promedio_diario',
  hidro_card_maximo_diario: 'hidro_card_maximo_diario',
  hidro_grafica_aporte_nivel_util_embalse_mes: 'hidro_grafica_aporte_nivel_util_embalse_mes',
  hidro_grafica_estatuto_desabastecimiento: 'hidro_grafica_estatuto_desabastecimiento',




};


// Constantes no utilizadas - eliminadas para evitar confusión
// const API_EXPANDER_EMBALSES = `${API}/v1/indicadores/hidrologia/indicadores_expander_embalses`;
// const API_EXPANDER_APORTES = `${API}/v1/indicadores/hidrologia/indicadores_expander_embalses_aportes`;

const API_HIDRO = import.meta.env.VITE_API_HIDRO || `http://192.168.8.138:8002/v1/indicadores/hidrologia/indicadores_hidraulicos`;
const API_APORTES = import.meta.env.VITE_API_HIDRO_APORTES || `http://192.168.8.138:8002/v1/graficas/hidrologia/grafica_aportes`;
const API_ESTATUTO = import.meta.env.VITE_API_ESTATUTO || `http://192.168.8.138:8002/v1/graficas/energia_electrica/grafica_estatuto`;
const API_GENERACION = import.meta.env.VITE_API_HIDRO_GENERACION || `http://192.168.8.138:8002/v1/indicadores/hidrologia/indicadores_generacion_sin`;
const API_PRECIOS = import.meta.env.VITE_API_HIDRO_PRECIOS || `http://192.168.8.138:8002/v1/indicadores/hidrologia/indicadores_precios_energia`;



/* ==================== helpers ==================== */
// (dejamos solo lo necesario para otras partes)
const extractCategories = (html) => {
  const m = html.match(/xAxis:\s*\{\s*categories:\s*\[([\s\S]*?)\]\s*,/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map(mm => mm[1]);
};

const extractAllSeriesUTCGeneric = (html) => {
  const out = [];
  const re = /\{\s*name\s*:\s*['"]([^'"]+)['"][\s\S]*?data\s*:\s*\[([\s\S]*?)\][\s\S]*?\}/g;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1];
    const dataBlock = m[2];
    const utc = [];
    const r2 = /\bDate\.UTC\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*[,]?\s*([\-\d.,]+)/g;
    let mm;
    while ((mm = r2.exec(dataBlock))) {
      utc.push([Date.UTC(+mm[1], +mm[2], +mm[3]), parseFloat(String(mm[4]).replace(',', '.'))]);
    }
    const num = dataBlock
      .split(',')
      .map(s => parseFloat(String(s).replace(',', '.')))
      .filter(v => Number.isFinite(v));
    out.push({ name, utc, num });
  }
  return out;
};

// Tiempo / límites
const EPOCH_FLOOR = Date.UTC(1971, 0, 1);
const HARD_MAX_JUL2025 = Date.UTC(2025, 6, 31);
function ymToUtc(ym) {
  const m = String(ym).match(/^(\d{4})-(\d{2})$/);
  if (!m) return NaN;
  return Date.UTC(+m[1], (+m[2]) - 1, 1);
}

// ====== Helpers para CONSOLIDADO ======
const num = (s) => {
  if (s == null) return NaN;
  const m = String(s).replace(/\s+/g,'').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

const pctNum = (s) => {
  if (s == null) return NaN;
  // acepta "+47.1%", "-34,9 %", "117%"
  const m = String(s).replace(/\s+/g,'').replace(',', '.').match(/([+-]?\d+(?:\.\d+)?)%?/);
  return m ? parseFloat(m[1]) : NaN;
};


function parseValueAndDelta(s) {
  if (!s) return { value: NaN, delta: NaN };
  const txt = String(s).replace(',', '.');
  const valM = txt.match(/-?\d+(?:\.\d+)?/);
  const value = valM ? parseFloat(valM[0]) : NaN;

 
  const dM = txt.match(/\(([^)]+)\)/);
  if (!dM) return { value, delta: NaN };


  let d = dM[1].trim().replace('+ -', '-').replace('+-', '-');
  const dNumM = d.match(/([+-]?\d+(?:\.\d+)?)/);
  const delta = dNumM ? parseFloat(dNumM[1]) : NaN;

  return { value, delta };
}

function deltaPctFromText(txt) {
  const m = String(txt || '').match(/\(([^)]+)\)/); // contenido entre paréntesis
  if (!m) return NaN;
  return pctNum(m[1]); // reaprovecha tu pctNum
}


function parseMW(v) {
  if (typeof v === 'number') return v;
  return num(v);
}

function AportesPctCell({ raw, value }) {
  // raw: texto original ("+81.3%", "-4.7%", "39.8%")
  // value: número (81.3, -4.7, 39.8)
  const txt = (raw ?? '').trim();
  const hasExplicitPlus  = /^[\s+]*\+/.test(txt);
  const hasExplicitMinus = /^[\s-]*-/.test(txt) || txt.startsWith('−'); // considera guion y '−'
  const hasSign = hasExplicitPlus || hasExplicitMinus;

  if (hasSign) {
    // Usa DeltaBadge con el número; se colorea verde si >=0, rojo si <0
    return <DeltaBadge value={Number.isFinite(value) ? value : NaN} suffix="%" />;
  }
  // Sin signo explícito → neutro
  const shown = Number.isFinite(value) ? `${value.toFixed(2)}%` : (txt || '—');
  return <span className="text-gray-200">{shown}</span>;
}


function useHidroRowsFromConsolidado() {
  const { data, isLoading: loading } = useHidrologiaConsolidado();
  
  const { rows, regionSummary } = useMemo(() => {
    if (!data) return { rows: [], regionSummary: {} };
    
    const regiones = Array.isArray(data?.regiones) ? data.regiones : [];
    const out = [];
    const summary = {}; // region -> { ... }

    for (const reg of regiones) {
      const regionName = String(reg?.nombre || '').trim();

      // ---- RESUMEN POR REGIÓN (solo para la fila colapsada de la región) ----
      const nivelRegionPct    = pctNum(reg?.resumen?.nivel);
      const aportesRegionRaw  = String(reg?.resumen?.aportes_hidricos ?? '').trim();
      const aportesRegionPct  = pctNum(aportesRegionRaw);
      const capacidadRegionMW = parseMW(reg?.resumen?.capacidad_generacion_mw);

      const volumenRegionGwh       = num(reg?.resumen?.volumen_gwh_dia);
      const deltaVolumenRegionGwh  = num(reg?.resumen?.delta_volumen_gwh_dia);
      const capacidadUtilRegionGwh = num(reg?.resumen?.capacidad_util_gwh_dia);

      const aportesRegionGwh       = num(reg?.resumen?.aportes_gwh_dia_region);
      const mediaHistRegionGwh     = num(reg?.resumen?.media_historica_aportes_gwh_dia_region);

      summary[regionName] = {
        // pestaña Resumen
        nivelPct: nivelRegionPct,
        aportesRaw: aportesRegionRaw,
        aportesPct: aportesRegionPct,
        capacidadMW: capacidadRegionMW,

        // pestaña Embalses
        volumenGwh: volumenRegionGwh,
        cambioGwh: deltaVolumenRegionGwh,
        capacidadGwhDia: capacidadUtilRegionGwh,

        // pestaña Aportes
        aportesGwh: aportesRegionGwh,
        mediaHistoricaGwhDia: mediaHistRegionGwh,

        // sin % regional de "aportes del total"
        porcentajeTexto: '',
        aportesGwhDelta: NaN,
      };

      // === Filas por embalse (igual que ya tenías, solo guardamos también el "raw" de aportes de resumen) ===
      const embalses = Array.isArray(reg?.embalses) ? reg.embalses : [];
      for (const e of embalses) {
        const embalse = String(e?.nombre || '').trim();

        // --- datos del embalse (SIEMPRE del embalse) ---
        const nivelEmbalsePctResumen  = pctNum(e?.resumen?.nivel);
        const aportesHidRaw           = String(e?.resumen?.aportes_hidricos ?? '').trim();
        const aportesHidPctResumen    = pctNum(aportesHidRaw);
        const capacidadMWEmbalse      = parseMW(e?.resumen?.capacidad_generacion_mw);

        // detalle embalse
        const { value: volGwh,  delta: volDelta } = parseValueAndDelta(e?.detalle_embalse?.volumen_gwh_dia);
        const nivelEmbalsePctDetalle  = pctNum(e?.detalle_embalse?.nivel);
        const capacidadGwhDiaEmbalse  = num(e?.detalle_embalse?.capacidad_gwh_dia);

        // detalle aportes
        const { value: aportesGwh, delta: aportesDelta } = parseValueAndDelta(e?.detalle_aportes?.aportes_gwh_dia);
        const porcentajeTexto       = String(e?.detalle_aportes?.porcentaje ?? '').trim();
        const aportesPctDetalleNum  = pctNum(e?.detalle_aportes?.porcentaje);
        const mediaHistGwhDiaEmb    = num(e?.detalle_aportes?.media_historica_gwh_dia);

        out.push({
          region: regionName,
          embalse: String(e?.nombre || '').trim(),

          // pestaña RESUMEN (del embalse, sin mezclar región)
          nivelPct: Number.isFinite(nivelEmbalsePctDetalle) ? nivelEmbalsePctDetalle : nivelEmbalsePctResumen,
          aportesHidricosPct: aportesHidPctResumen,
          aportesHidricosRaw: aportesHidRaw,
          capacidadMW: capacidadMWEmbalse,

          // pestaña EMBALSES
          volumenGwh: volGwh,
          cambioGwh: volDelta,
          capacidadGwhDia: capacidadGwhDiaEmbalse,

          // pestaña APORTES
          aportesGwh,
          aportesGwhDelta: aportesDelta,
          mediaHistoricaGwhDia: mediaHistGwhDiaEmb,
          aportesPctDetalle: aportesPctDetalleNum,
          porcentajeTexto,
        });
      }
    }

    // ordenamos por región/embalse
    out.sort((a,b)=> a.region.localeCompare(b.region) || a.embalse.localeCompare(b.embalse));
    return { rows: out, regionSummary: summary };
  }, [data]);

  return { rows, loading, regionSummary };
}


/* ======================= Índices (defaults) ======================= */
const defaultIndices = [
  {
    title: 'Nivel de embalse actual',
    updated: '—',
    value: '—',
    deltaText: '—',
    deltaDir: 'down',
    pct: '—',
    pctDeltaText: '—',
    pctDeltaDir: 'down',
    pctValueNum: 0,
  },
  {
    title: 'Aportes mensuales promedio',
    updated: '—',
    value: '—',
    deltaText: '—',
    deltaDir: 'down',
    pct: '—',
    pctDeltaText: '—',
    pctDeltaDir: 'down',
    sub: 'Media histórica: —',
  },
  {
    title: 'Generación promedio diaria',
    updated: 'Julio vs junio 2025',
    groups: [
      { name: 'Hídrica', value: '198.49', unit: 'GWh-día', delta: '+7.2 GWh (+3.6%)', dir: 'up' },
      { name: 'Térmica', value: '24.37', unit: 'GWh-día', delta: '−0.7 GWh (−2.6%)', dir: 'down' },
      { name: 'FNCER', value: '15.03', unit: 'GWh-día', delta: '+1.2 GWh (+8.9%)', dir: 'up' },
    ],
    bottom: 'Demanda real promedio: 234.90 GWh – día',
    bottomDelta: '+7.7 GWh (+3.3%)',
    bottomDir: 'up',
  },
  {
    title: 'Precios de energía – Julio vs junio 2025',
    updated: 'Promedios mensuales diarios (COP/kWh)',
    groups: [
      { name: 'Mínimo\nDiario', value: '102.96', unit: 'COP/kWh', delta: '−3.82 (−3.7%)', dir: 'down' },
      { name: 'Promedio\nDiario', value: '125.75', unit: 'COP/kWh', delta: '+13.77 (+10.9%)', dir: 'up' },
      { name: 'Máximo\nDiario', value: '352.33', unit: 'COP/kWh', delta: '+170.34 (+48.3%)', dir: 'up' },
    ],
    badge: 'Precio marginal de escasez',
    badgeValue: '865.22 COP/kWh'
  },
];

function TrendChip({ dir = 'up', children }) {
  const isUp = dir === 'up';
  const bg = isUp ? tokens.colors.status.positive : tokens.colors.status.negative;
  return (
    <span
      className="
        inline-flex items-center gap-1 px-3 py-1
        rounded-full text-sm font-semibold
        whitespace-nowrap leading-none
      "
      style={{
        backgroundColor: bg,
        color: tokens.colors.text.primary,
        border: '1px solid rgba(0,0,0,.15)',
        fontSize: '12px'
      }}
    >
      <span aria-hidden className="text-base leading-none">{isUp ? '↑' : '↓'}</span>
      <span className="leading-none" style={{ color: tokens.colors.text.primary }}>{children}</span>
    </span>
  );
}


/* -------- inyección de estilos para iframes embebidos (srcDoc) -------- */
function injectStylesForGeneral(html) {
  const CSS = `
    :root, body { background: ${COLORS.darkBg}; color: ${COLORS.gray}; }
    body { font-family: Nunito Sans, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; }
    a, button { color: ${COLORS.gray}; }
    .btn, .button, .dt-button { background: ${COLORS.darkBg2} !important; border: 1px solid ${COLORS.border} !important; color: ${COLORS.gray} !important; }
    .card, .panel, .container, .content, .dataTables_wrapper { background: ${COLORS.darkBg}; color: ${COLORS.gray}; }
    table thead tr, table thead th, table thead td,
    .table thead tr, .table thead th, .table thead td,
    .thead, .thead-dark, .thead-light,
    .dataTables_wrapper .dataTables_scrollHead,
    .dataTables_wrapper .dataTables_scrollHeadInner {
      background: ${COLORS.darkBg2} !important;
      color: ${COLORS.gray} !important;
      border-color: ${COLORS.border} !important;
    }
    table, .table { color: ${COLORS.gray} !important; border-color: ${COLORS.border} !important; }
    table tbody tr, .table tbody tr, tr[role="row"] { background: ${COLORS.darkBg} !important; }
    table tbody tr:nth-child(even), .table tbody tr:nth-child(even) { background: ${COLORS.darkBg2} !important; }
    table tbody td, .table tbody td, table tbody th, .table tbody th { border-color: ${COLORS.border} !important; background: transparent !important; }
    .table-striped tbody tr:nth-of-type(odd) { background: ${COLORS.darkBg} !important; }
    .table-hover tbody tr:hover { background: ${COLORS.darkBg2} !important; }
    .text-muted, .muted, small { color: ${COLORS.gray} !important; }
    .progress { background: ${COLORS.darkBg2} !important; border: 1px solid ${COLORS.border} !important; height: 14px !important; }
    .progress .progress-bar { background: ${COLORS.blue} !important; }
  `;
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${CSS}</style></head>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`;
}

function injectStylesForAportes(html) {
  const CSS = `
    :root, body { background: ${COLORS.darkBg}; color: ${COLORS.gray}; }
    body { font-family: Nunito Sans, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; }
    a, button { color: ${COLORS.gray}; }
    .btn, .button, .dt-button { background: ${COLORS.darkBg2} !important; border: 1px solid ${COLORS.border} !important; color: ${COLORS.gray} !important; }
    .card, .panel, .container, .content, .dataTables_wrapper { background: ${COLORS.darkBg}; color: ${COLORS.gray}; }
    table thead tr, table thead th, table thead td,
    .table thead tr, .table thead th, .table thead td,
    .thead, .thead-dark, .thead-light,
    .dataTables_wrapper .dataTables_scrollHead,
    .dataTables_wrapper .dataTables_scrollHeadInner {
      background: ${COLORS.darkBg2} !important;
      color: ${COLORS.gray} !important;
      border-color: ${COLORS.border} !important;
    }
    .bg-primary, .bg-info, .bg-warning, .bg-success, .bg-danger { background-color: ${COLORS.gray} !important; }
    table, .table { color: ${COLORS.gray} !important; border-color: ${COLORS.border} !important; }
    table tbody tr, .table tbody tr, tr[role="row"] { background: ${COLORS.darkBg} !important; }
    table tbody tr:nth-child(even), .table tbody tr:nth-child(even) { background: ${COLORS.darkBg2} !important; }
    table tbody td, .table tbody td, table tbody th, .table tbody th { border-color: ${COLORS.border} !important; background: transparent !important; }
    .table-striped tbody tr:nth-of-type(odd) { background: ${COLORS.darkBg} !important; }
    .table-hover tbody tr:hover { background: ${COLORS.darkBg2} !important; }
    .text-muted, .muted, small { color: ${COLORS.gray} !important; }
    .progress { background: ${COLORS.darkBg2} !important; border: 1px solid ${COLORS.border} !important; height: 14px !important; }
    .progress .progress-bar { transition: background-color .25s ease; }
  `;

  const SCRIPT = `
  (function(){
    function parsePercent(s){
      if(!s) return NaN;
      var m = String(s).match(/([0-9]+(?:[\\.,][0-9]+)?)/);
      if(!m) return NaN;
      return parseFloat(m[1].replace(',', '.'));
    }
    function colorFor(p){
      if (p > 90) return '${COLORS.blue}';
      if (p >= 60) return '${COLORS.up}';
      if (p >= 30) return '${tokens.colors.status.warning}';
      return '${COLORS.down}';
    }
    var bars = document.querySelectorAll('.progress .progress-bar, .progress-bar');
    bars.forEach(function(bar){
      var p = NaN;
      if (bar.style && bar.style.width) p = parsePercent(bar.style.width);
      if (isNaN(p)) {
        var txt = (bar.closest('td') && bar.closest('td').textContent) || bar.parentElement.textContent || '';
        p = parsePercent(txt);
      }
      if (!isNaN(p)) bar.style.backgroundColor = colorFor(p);
    });

    var whitey = document.querySelectorAll('.bg-white, .card, .panel, .row, .col, .section, .container, .content');
    whitey.forEach(function(n){
      var styleBg = getComputedStyle(n).backgroundColor;
      if (styleBg === 'rgb(255, 255, 255)') n.style.backgroundColor = '${COLORS.darkBg}';
    });
  })();
  `;

  if (html.includes('</head>') && html.includes('</body>')) {
    return html
      .replace('</head>', `<style>${CSS}</style></head>`)
      .replace('</body>', `<script>${SCRIPT}</script></body>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}<script>${SCRIPT}</script></body></html>`;
}

function TitleRow({ title, updated, icon = hidrologiaIcon }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <img src={icon} alt="" className="w-6 h-6 md:w-7 md:h-7" />
        <span className="font-semibold text-gray-300 text-[17px]">{title}</span>
      </div>
      {updated && <span className="text-xs text-gray-400">{updated}</span>}
    </div>
  );
}

function MiniStatTile({ name, value, unit, delta, dir = 'up', icon = null, multilineName=false, onHelpClick }) {
// Función de ayuda específica (puedes ajustarla para que muestre contenido diferente)
  // const handleHelpClick = (cardName) => {
  //   alert(`Ayuda para la métrica: ${cardName}`);
  // };

return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] p-3 bg-surface-primary w-full min-w-40">
      <div className="flex items-center gap-2 mb-1">
        {icon && <img src={icon} alt="" className="w-6 h-6 md:w-7 md:h-7 opacity-90" />}
        <span className={`font-semibold text-gray-300 ${multilineName ? 'whitespace-pre-line' : ''}`}>{name}</span>
      </div>
      <div className="text-white text-xl">{value}</div>
      <div className="text-gray-300 text-sm">{unit}</div>
      
      {/* CÓDIGO CLAVE: Colocar el chip y el botón en el mismo flex container */}
      <div className="mt-2 flex items-center gap-1"> {/* Agregamos 'flex items-center gap-1' */}
        <TrendChip dir={dir}>{delta}</TrendChip>

        {/* Botón de Ayuda (HelpCircle) */}
       <button
          onClick={onHelpClick}
          className="flex items-center justify-center 
            h-6 w-6 
            rounded-md 
            bg-neutral-700 hover:bg-neutral-600 transition-colors
            ml-1"
          title={`Ayuda sobre ${name}`}
        >
          <HelpCircle className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// normaliza números con coma o punto
const n = (s) => {
  if (s == null) return NaN;
  const m = String(s).replace(/\s+/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

function parseTablaCompleta(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tbody tr'));
  const out = [];
  let region = '';

  rows.forEach(tr => {
    if (tr.classList.contains('region-row')) {
      const cell = tr.querySelector('.region-cell');
      region = cell ? cell.textContent.trim() : region;
      return;
    }
    const tds = tr.querySelectorAll('td');
    if (tds.length < 6) return;

    const embalse = tds[1]?.textContent?.trim() || '';
    const volumenGwh = n(tds[2]?.textContent);
    const cambioGwh = n(tds[3]?.textContent);

    const levelEl = tds[4]?.querySelector('.level-value');
    const nivelPct = n(levelEl ? levelEl.textContent : tds[4]?.textContent);

    const aportesValEl = tds[5]?.querySelector('.aportes-value');
    const aportesGwh = n(aportesValEl ? aportesValEl.textContent : '');

    const aportesPctEl = tds[5]?.querySelector('.aportes-percent');
    const aportesPct = n(aportesPctEl ? aportesPctEl.textContent : '');

    out.push({
      region, embalse,
      volumenGwh, cambioGwh,
      nivelPct, aportesGwh, aportesPct,
      capacidadMW: null,
      capacidadGwhDia: null,
      mediaHistoricaGwhDia: null,
    });
  });

  return out;
}

function parseChart3(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tbody tr'));
  const out = [];
  let region = '';

  rows.forEach(tr => {
    if (tr.classList.contains('region')) {
      region = tr.textContent.trim();
      return;
    }
    const cells = tr.querySelectorAll('td');
    if (cells.length < 5) return;
    const embalse = cells[1]?.textContent?.trim() || '';
    const volumenGwh = n(cells[2]?.textContent);
    const cambioGwh = n(cells[3]?.textContent);
    const nivelPct = n(cells[4]?.textContent);

    out.push({ region, embalse, volumenGwh, cambioGwh, nivelPct });
  });

  return out;
}

function mergeRows(primary, fallback) {
  const key = (r) => `${r.region}::${r.embalse}`.toUpperCase();
  const map = new Map(primary.map(r => [key(r), { ...r }]));
  fallback.forEach(r => {
    const k = key(r);
    if (!map.has(k)) map.set(k, { ...r });
    else {
      const tgt = map.get(k);
      ['volumenGwh','cambioGwh','nivelPct'].forEach(f => {
        if (!(Number.isFinite(tgt[f]) && !Number.isNaN(tgt[f])) && Number.isFinite(r[f])) tgt[f] = r[f];
      });
    }
  });
  return Array.from(map.values()).sort((a,b)=> a.region.localeCompare(b.region) || a.embalse.localeCompare(b.embalse));
}

function useHidroRows(chart3Html, tablaHidrologiaCompleta) {
  return useMemo(() => {
    const a = parseTablaCompleta(tablaHidrologiaCompleta);
    const b = parseChart3(chart3Html);
    return mergeRows(a, b);
  }, []);
}

// Badge +/- con color
function DeltaBadge({ value, suffix = '%', className='' }) {
  if (!Number.isFinite(value)) return <span className={`text-text-muted ${className}`}>—</span>;
  const pos = value >= 0;
  const color = pos ? tokens.colors.status.positive : tokens.colors.status.negative;
  const sign = pos ? '+' : '';
  return <span className={className} style={{color}}>{`${sign}${value.toFixed(2)}${suffix}`}</span>;
}

function DeltaInline({
  value,
  decimals = 2,
  suffix = '',
  showPlus = true,
  parens = true,
}) {
  if (!Number.isFinite(value) || value === 0) return null;
  const color = value > 0 ? tokens.colors.status.positive : tokens.colors.status.negative;
  const sign  = value > 0 && showPlus ? '+' : '';
  const text  = `${parens ? '(' : ''}${sign}${value.toFixed(decimals)}${suffix}${parens ? ')' : ''}`;
  return <span className="ml-1" style={{ color }}>{text}</span>;
}

// Barra de nivel
function NivelBar({ pct }) {
  const p = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;

  let bar = tokens.colors.status.info;
  if (p < 30) bar = tokens.colors.status.negative;
  else if (p < 60) bar = tokens.colors.status.warning;
  else if (p < 90) bar = tokens.colors.status.positive;

  return (
    <div className="w-full">
      <div className="mb-1 leading-none">
        <span className="text-gray-200 text-sm font-semibold">
          {Number.isFinite(pct) ? `${Math.round(pct)}%` : '—'}
        </span>
      </div>
      <div className="relative h-3 rounded bg-surface-secondary border border-[color:var(--border-subtle)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${p}%`, background: bar }}
        />
      </div>
    </div>
  );
}

// Agrupa por región
function groupByRegion(rows) {
  const map = new Map();
  rows.forEach(r => {
    if (!map.has(r.region)) map.set(r.region, []);
    map.get(r.region).push(r);
  });
  return Array.from(map.entries());
}

function HidroTabs({ data, regionSummary = {} }) {
  const [tab, setTab] = useState('resumen');
  const [open, setOpen] = useState(() => new Set());
  const groups = useMemo(() => groupByRegion(data), [data]);

  useMemo(() => {
    if (groups.length && open.size === 0) {
      const s = new Set(open);
      s.add(groups[0][0]);
      setOpen(s);
    }
  }, [groups]);

  const toggle = (region) => {
    const s = new Set(open);
    if (s.has(region)) s.delete(region); else s.add(region);
    setOpen(s);
  };

  return (
    <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl overflow-hidden">
      <div className="px-3 pt-3 border-b border-[color:var(--border-subtle)]">
        <div className="flex gap-6">
          {[
            ['resumen','Resumen'],
            ['embalses','Embalses'],
            ['aportes','Aportes'],
          ].map(([k,label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`pb-2 text-sm ${tab===k ? 'text-white border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary">
            {tab === 'resumen' && (
              <tr>
                <th className="text-left px-3 py-2 text-gray-300 font-medium">Región / Embalse</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Nivel</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Aportes hídricos</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Capacidad generación (MW)</th>
              </tr>
            )}
            {tab === 'embalses' && (
              <tr>
                <th className="text-left px-3 py-2 text-gray-300 font-medium">Región / Embalse</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Volumen (GWh-día)</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Nivel</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Capacidad (GWh-día)</th>
              </tr>
            )}
            {tab === 'aportes' && (
              <tr>
                <th className="text-left px-3 py-2 text-gray-300 font-medium">Región / Embalse</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Aportes (GWh-día)</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Porcentaje de aportes</th><th className="text-left px-3 py-2 text-gray-300 font-medium">Media histórica (GWh-día)</th>
              </tr>
            )}
          </thead>

          <tbody>
          {groups.map(([region, rows]) => {
            const sum = regionSummary[region] || null;

            return (
              <React.Fragment key={region}>
                {/* Fila de región visible en vista colapsada con las 4 columnas */}
                <tr className="bg-surface-primary border-b border-[color:var(--border-subtle)] hover:bg-[#2a2a2a]">
                  {/* Columna: Región + botón expandir */}
                  <td className="px-3 py-2">
                    <button
                      className="text-gray-200 font-semibold inline-flex items-center gap-2"
                      onClick={() => toggle(region)}
                      aria-expanded={open.has(region)}
                    >
                      <span className="inline-block w-5 text-center">{open.has(region) ? '−' : '+'}</span>
                      {region}
                    </button>
                  </td>
                  {/* Columnas de métricas por pestaña (se ven aun colapsado) */}
                  {tab === 'resumen' && (
                    <>
                      {/* Nivel */}
                      <td className="px-3 py-2 align-top w-[290px]">
                        {sum && Number.isFinite(sum.nivelPct)
                          ? <NivelBar pct={sum.nivelPct} />
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Aportes hídricos (verde si +, rojo si −, neutro si sin signo) */}
                      <td className="px-3 py-2">
                        {sum
                          ? <AportesPctCell raw={sum.aportesRaw} value={sum.aportesPct} />
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Capacidad generación (MW) */}
                      <td className="px-3 py-2 text-gray-200">
                        {sum && Number.isFinite(sum.capacidadMW)
                          ? sum.capacidadMW.toLocaleString('es-CO', { maximumFractionDigits: 0 })
                          : '—'}
                      </td>
                    </>
                  )}
                  {tab === 'embalses' && (
                    <>
                      {/* Volumen (GWh-día) – consolidado por región */}
                      <td className="px-3 py-2 text-gray-200">
                        {sum && Number.isFinite(sum.volumenGwh)
                          ? (
                            <>
                              {sum.volumenGwh.toFixed(2)}
                              <DeltaInline value={Number.isFinite(sum.cambioGwh) ? sum.cambioGwh : NaN} />
                            </>
                          )
                          : '—'}
                      </td>

                      {/* Nivel % – consolidado por región */}
                      <td className="px-3 py-2 align-top w-[290px]">
                        {sum && Number.isFinite(sum.nivelPct)
                          ? <NivelBar pct={sum.nivelPct} />
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Capacidad útil (GWh-día) – consolidado por región */}
                      <td className="px-3 py-2 text-gray-200">
                        {sum && Number.isFinite(sum.capacidadGwhDia)
                          ? sum.capacidadGwhDia.toFixed(2)
                          : '—'}
                      </td>
                    </>
                  )}
                  {tab === 'aportes' && (
                    <>
                      {/* Aportes (GWh-día) – consolidado por región */}
                      <td className="px-3 py-2 text-gray-200">
                        {sum && Number.isFinite(sum.aportesGwh)
                          ? (<>
                              {sum.aportesGwh.toFixed(2)}
                              <DeltaInline value={Number.isFinite(sum.aportesGwhDelta) ? sum.aportesGwhDelta : NaN} />
                            </>)
                          : '—'}
                      </td>

                      {/* Porcentaje de aportes – usar el MISMO valor de “aportes hídricos” del resumen */}
                      <td className="px-3 py-2">
                        {sum
                          ? <AportesPctCell raw={sum.aportesRaw} value={sum.aportesPct} />
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Media histórica (GWh-día) – consolidado por región */}
                      <td className="px-3 py-2 text-gray-200">
                        {sum && Number.isFinite(sum.mediaHistoricaGwhDia)
                          ? sum.mediaHistoricaGwhDia.toFixed(2)
                          : '—'}
                      </td>
                    </>
                  )}

                </tr>

                {/* Filas por embalse (solo cuando está expandido) */}
                {open.has(region) && rows.map((r) => (
                  <tr key={`${region}::${r.embalse}`} className="border-b border-[#2e2e2e] hover:bg-[#2a2a2a]">
                    <td className="px-3 py-2 text-gray-200">
                      <div className="pl-6">{r.embalse}</div>
                    </td>
                    {tab === 'resumen' && (
                      <>
                        <td className="px-3 py-2 align-top w-[290px]"><NivelBar pct={r.nivelPct} /></td>
                        <td className="px-3 py-2">
                          <AportesPctCell raw={r.aportesHidricosRaw} value={r.aportesHidricosPct} />
                        </td>
                        <td className="px-3 py-2 text-gray-200">
                          {Number.isFinite(r.capacidadMW)
                            ? r.capacidadMW.toLocaleString('es-CO', { maximumFractionDigits: 0 })
                            : '—'}
                        </td>
                      </>
                    )}
                    {tab === 'embalses' && (
                      <>
                        <td className="px-3 py-2 text-gray-200">
                          {Number.isFinite(r.volumenGwh) ? r.volumenGwh.toFixed(2) : '—'}
                          <DeltaInline value={Number.isFinite(r.cambioGwh) ? r.cambioGwh : NaN} />
                        </td>
                        <td className="px-3 py-2 align-top w-[290px]">
                          <NivelBar pct={r.nivelPct} />
                        </td>
                        <td className="px-3 py-2 text-gray-200">
                          {Number.isFinite(r.capacidadGwhDia) ? r.capacidadGwhDia.toFixed(2) : '—'}
                        </td>
                      </>
                    )}
                    {tab === 'aportes' && (
                      <>
                        <td className="px-3 py-2 text-gray-200">
                          {Number.isFinite(r.aportesGwh) ? r.aportesGwh.toFixed(2) : '—'}
                          <DeltaInline value={Number.isFinite(r.aportesGwhDelta) ? r.aportesGwhDelta : NaN} />
                        </td>
                        <td className="px-3 py-2">
                          <AportesPctCell raw={r.porcentajeTexto} value={r.aportesPctDetalle} />
                        </td>
                        <td className="px-3 py-2 text-gray-200">
                          {Number.isFinite(r.mediaHistoricaGwhDia) ? r.mediaHistoricaGwhDia.toFixed(2) : '—'}
                        </td>
                      </>
                    )}

                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useHidroRowsFromApi() {
  const { data: embData, isLoading: loadingEmb } = useHidrologiaEmbalses();
  const { data: apoData, isLoading: loadingApo } = useHidrologiaAportes();
  
  const loading = loadingEmb || loadingApo;
  
  const rows = useMemo(() => {
    if (!embData || !apoData) return [];

    const embalses = Array.isArray(embData?.resumen_detallado_embalse)
      ? embData.resumen_detallado_embalse
      : [];
    console.log('[Expander Embalses] Total embalses:', embalses.length);

    const aportes = Array.isArray(apoData?.data) ? apoData.data : [];
    console.log('[Expander Aportes] Total aportes:', aportes.length);

        // === 3️⃣ Mapeo y merge ===
        const mapAportes = new Map();
        for (const a of aportes) {
          if (!a.Embalse || !a.Region) continue;
          const key = `${a.Region}::${a.Embalse}`.toUpperCase();
          mapAportes.set(key, {
            region: a.Region,
            embalse: a.Embalse,
            aportesGwh: Number(a['Aportes del día (GWh-día)']) || NaN,
            aportesPct: Number(a['% Aportes del Total']) || NaN,
            mediaHistoricaGwhDia: Number(a['Aporte Medio Histórico (GWh-día)']) || NaN,
            cambioGwh: Number(a['Var. GWh vs Día Anterior']) || NaN,
          });
        }

        const merged = embalses.map(e => {
          const key = `${e.Region}::${e.Embalse}`.toUpperCase();
          const apo = mapAportes.get(key);
          return {
            region: e.Region,
            embalse: e.Embalse,
            volumenGwh: Number(e['Volumen útil (GWh-día)']) || NaN,
            cambioGwh: Number(e['Variación Volumen útil (GWh-día)']) || NaN,
            nivelPct: Number(e['Nivel (%)']) || NaN,
            capacidadGwhDia: Number(e['Capacidad útil (GWh-día)']) || NaN,
            ...(apo || {}), // mezcla datos de aportes
          };
        });

    console.log('[Hidrología Merge Final] Ejemplo de fila:', merged[0]);
    return merged;
  }, [embData, apoData]);

  return { rows, loading };
}

function useAportesOptionsFromApi() {
  const { data, isLoading } = useGraficaAportes();
  
  const { series, range } = useMemo(() => {
    if (!data || !Array.isArray(data)) return { 
      series: { s1: [], s2: [], s3: [] }, 
      range: { minX: undefined, maxX: undefined } 
    };

    const s1 = [], s2 = [], s3 = [];
    for (const row of data) {
      const x = ymToUtc(row.mes);
      if (!Number.isFinite(x)) continue;
      const gwh   = Number(row.aportes_gwh);
      const media = Number(row.aportes_media_historica);
      const pct   = Number(row.porcentaje_util);
      if (Number.isFinite(gwh))   s1.push([x, gwh]);
      if (Number.isFinite(media)) s2.push([x, media]);
      if (Number.isFinite(pct))   s3.push([x, pct]);
    }
    s1.sort((a,b)=>a[0]-b[0]); s2.sort((a,b)=>a[0]-b[0]); s3.sort((a,b)=>a[0]-b[0]);

    const allX = [...s1, ...s2, ...s3].map(p=>p[0]);
    const minX = allX.length ? Math.max(Math.min(...allX), EPOCH_FLOOR) : undefined;
    const maxX = allX.length ? Math.min(Math.max(...allX), HARD_MAX_JUL2025) : undefined;

    return { series: { s1, s2, s3 }, range: { minX, maxX } };
  }, [data]);

  return useMemo(() => ({
    chart: { backgroundColor: COLORS.darkBg, height: 650, marginTop: 80, marginBottom: 180, spacingBottom: 40 },
    title: {
      text: 'Aportes y nivel útil de embalses por mes',
      align: 'left',
      style: { fontFamily: 'Nunito Sans, sans-serif', fontSize: '16px', color: tokens.colors.text.primary }
    },
    xAxis: {
      type: 'datetime',
      min: range.minX,
      max: range.maxX,
      gridLineWidth: 1,
      gridLineColor: tokens.colors.border.subtle,
      tickPixelInterval: 130,
      labels: {
        rotation: -45, align: 'right', autoRotation: undefined,
        formatter() { return Highcharts.dateFormat('%Y-%m', this.value); },
        style: { color: COLORS.gray, fontSize: '12px' }
      }
    },
    yAxis: [
      { title: { text: 'Aportes (GWh-día)', style: { color: COLORS.gray } }, labels: { style: { color: COLORS.gray } } },
      { title: { text: 'Nivel (%)', style: { color: COLORS.gray } }, labels: { style: { color: COLORS.gray } }, opposite: true }
    ],
    legend: {
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      y: 20,
      itemStyle: { color: tokens.colors.text.primary, fontSize: '16px' }
    },
    plotOptions: { series: { marker: { radius: 3, enabled: false }, lineWidth: 2, turboThreshold: 0 } },
    series: [
      { name: 'Aportes (GWh-dia)', type: 'line', color: tokens.colors.status.positive, data: series.s1, tooltip: { valueSuffix: ' GWh-dia' } },
      { name: 'Aportes Media Histórica (GWh-dia)', type: 'line', color: COLORS.yellow, dashStyle: 'Dash', data: series.s2, tooltip: { valueSuffix: ' GWh-dia' } },
      { name: 'Nivel de Embalse Util (%)', type: 'area', yAxis: 1, color: tokens.colors.status.info, fillOpacity: 0.3, lineWidth: 1, data: series.s3, tooltip: { valueSuffix: '%' } },
    ],
    tooltip: {
      backgroundColor: tokens.colors.surface.primary,
      borderColor: tokens.colors.border.default,
      style: { color: tokens.colors.text.primary, fontSize: '13px' },
      padding: 10,
      xDateFormat: '%Y-%m',
      shared: true,
      useHTML: true,
      formatter: function () {
        let header = `<b>${Highcharts.dateFormat('%e %b %Y', this.x)}</b><br/>`;
        let rows = this.points.map((p) => {
          const suffix = (p.series.options.tooltip && p.series.options.tooltip.valueSuffix) || '';
          return `
            <div style="user-select:text;pointer-events:auto;margin:10px 0;">
              <span style="color:${p.color};  fontSize:20px;">● </span>
              ${p.series.name}: <b>${Highcharts.numberFormat(p.y, 2)}${suffix}</b>
            </div>`;
        }).join('');
        return `<div style="padding:5px;">${header}${rows}</div>`;
      },
    },
  }), [series, range]);
}

function useDesabastecimientoOptionsFromApi() {
  const { data, isLoading, error } = useGraficaEstatuto();
  
  const { series, range } = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      if (error && import.meta.env.DEV) {
        console.error('[Estatuto API] Error:', error);
      }
      return {
        series: { pBolsa: [], pEscasez: [], nivelPct: [], sendaPct: [] },
        range: { minX: undefined, maxX: undefined }
      };
    }

        const pBolsa = [];
        const pEscasez = [];
        const nivelPct = [];
        const sendaPct = [];

        for (const r of data) {
          const [y, m, d] = String(r.fecha || '').split('-').map(Number);
          const x = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? Date.UTC(y, m - 1, d) : NaN;
          if (!Number.isFinite(x)) continue;

          const bolsa  = Number(r['Precio de Bolsa en Períodos Punta']);
          const escasez = Number(r['Precio Marginal de Escasez']);
          let nivel   = Number(r['Volumen útil del embalse']);
          let senda   = r['Senda de Referencia'];
          senda = senda == null ? NaN : Number(senda);

          // Normalizo a % si viene 0–1
          if (Number.isFinite(nivel)) nivel = nivel <= 1 ? nivel * 100 : nivel;
          if (Number.isFinite(senda)) senda = senda <= 1 ? senda * 100 : senda;

          if (Number.isFinite(bolsa))   pBolsa.push([x, bolsa]);
          if (Number.isFinite(escasez)) pEscasez.push([x, escasez]);
          if (Number.isFinite(nivel))   nivelPct.push([x, nivel]);
          if (Number.isFinite(senda))   sendaPct.push([x, senda]);
        }

    [pBolsa, pEscasez, nivelPct, sendaPct].forEach(a => a.sort((a1, a2) => a1[0] - a2[0]));
    const allX = [...pBolsa, ...pEscasez, ...nivelPct, ...sendaPct].map(p => p[0]);
    const minX = allX.length ? Math.min(...allX) : undefined;
    const maxX = allX.length ? Math.max(...allX) : undefined;

    return { series: { pBolsa, pEscasez, nivelPct, sendaPct }, range: { minX, maxX } };
  }, [data]);

  return useMemo(() => {
    if (!range.minX || !range.maxX) {
      return {
        chart: {
          backgroundColor: COLORS.darkBg,
          height: 600,
        },
        title: {
          text: isLoading ? 'Cargando gráfica de estatuto...' : 'Estatuto de desabastecimiento',
          style: { color: COLORS.gray }
        },
        series: []
      };
    }
    
    return {
    chart: {
      zooming: { type: 'x' },
      backgroundColor: COLORS.darkBg,
      height: 600,
      marginTop: 50,
      marginBottom: 140,
      spacingBottom: 20,
    },
    title: {
      text: 'Estatuto de desabastecimiento',
      align: 'left',
      style: { fontFamily: 'Nunito Sans, sans-serif', fontSize: '16px', color: tokens.colors.text.primary }
    },
    xAxis: {
      type: 'datetime',
      min: range.minX,
      max: range.maxX,
      gridLineWidth: 1,
      gridLineColor: tokens.colors.border.subtle,
      labels: {
        rotation: -45,
        align: 'right',
        autoRotation: undefined,
        style: { color: COLORS.gray, fontSize: '12px' },
        formatter() { return Highcharts.dateFormat('%Y-%m', this.value); },
      },
      title: { text: 'Fecha', style: { color: COLORS.gray, fontSize: '16px' } },
    },
    yAxis: [
      { // precios
        title: { text: 'Precios (COP/kWh)', style: { color: COLORS.gray, fontSize: '16px' } },
        labels: { style: { color: COLORS.gray, fontSize: '12px' } }
      },
      { // % embalse
        title: { text: 'Nivel de Embalse Útil (%)', style: { color: COLORS.gray, fontSize: '16px' } },
        labels: { format: '{value}%', style: { color: COLORS.gray, fontSize: '12px' } },
        opposite: true
      },
    ],
    legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom', y: 20, itemStyle: { color: COLORS.gray, fontSize: '16px' } },
    plotOptions: { series: { marker: { enabled: false }, turboThreshold: 0 } },
    series: [
      { name: 'Precio de bolsa en períodos punta (COP/kWh)', type: 'spline', yAxis: 0, color: tokens.colors.status.positive, data: series.pBolsa },
      { name: 'Precio marginal de escasez (COP/kWh)',        type: 'spline', yAxis: 0, color: COLORS.yellow, dashStyle: 'ShortDash', data: series.pEscasez },
      { name: 'Nivel de embalse útil (%)',                   type: 'areaspline', yAxis: 1, color: tokens.colors.status.info, fillOpacity: 0.2, data: series.nivelPct, tooltip: { valueSuffix: '%' } },
      ...(series.sendaPct.length
        ? [{ name: 'Senda de referencia (%)', type: 'spline', yAxis: 1, color: COLORS.down, dashStyle: 'Dot', data: series.sendaPct, tooltip: { valueSuffix: '%' } }]
        : []),
    ],
    tooltip: {
      backgroundColor: tokens.colors.surface.primary,
      valueDecimals: 2,
      style: { color: tokens.colors.text.primary, fontSize: '14px' },
      shared: true,
      useHTML: true,
      formatter: function () {
        const header = `<b>${Highcharts.dateFormat('%e %b %Y', this.x)}</b><br/>`;
        const rows = this.points.map(p => `
          <div style="user-select:text;pointer-events:auto; margin:5px 0 10px 0;">
            <span style="color:${p.color}; fontSize:20px;">● </span>
            ${p.series.name}: <b>${Highcharts.numberFormat(p.y, 2)}${p.series.yAxis && p.series.yAxis.opposite ? '%' : (p.series.name.includes('COP') ? '' : '')}</b>
          </div>
        `).join('');
        return `<div style="padding:0px;">${header}${rows}</div>`;
      },
    },
  };
  }, [series, range, isLoading]);
}


/* --------------------------------- Página --------------------------------- */
export default function Hidrologia() {
  




  // ⬇️ AHORA LA GRÁFICA DE APORTES USA API
  const aportesOptions = useAportesOptionsFromApi();
  const desabOptions = useDesabastecimientoOptionsFromApi();
  const [tab, setTab] = useState('aportes');
  const { rows: hidroRows, loading: loadingHidroRows, regionSummary } = useHidroRowsFromConsolidado();

  // === Índices desde API (sin cambios) ===
  const [indices, setIndices] = useState(defaultIndices);
  const [loadingIdx, setLoadingIdx] = useState(false);

  // Helpers de formato
  const fmtGwh = (v) => Number.isFinite(v) ? `${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })} GWh-día` : '—';
  const fmtPct = (v, opts = { maximumFractionDigits: 2 }) => Number.isFinite(v) ? `${v.toLocaleString('es-CO', opts)}%` : '—';
  const fmtSigned = (v, suffix='') => Number.isFinite(v)
    ? `${v >= 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${suffix}`
    : '—';
  const dirFrom = (v) => (Number.isFinite(v) && v < 0 ? 'down' : 'up');
  const monthEs = (m) => ([
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ][Math.max(0, Math.min(11, (m|0)-1))] || '—');

  // *** ESTADOS Y HOOKS PARA LA MODAL/TOOLTIPS ***
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    
    // 1. Usar el hook de tooltips para obtener los datos
    const { 
      data: tooltips = {},
      isLoading: loadingTooltips, 
      error: errorTooltips 
    } = useTooltips();
  
    // Función para cerrar la modal
    const closeModal = () => {
      setIsModalOpen(false);
      setModalTitle('');
      setModalContent('');
    };
  
    // Función para manejar el clic en el botón de ayuda
    const handleHelpClick = (cardKey, title) => {
      const tooltipId = TOOLTIP_IDENTIFIERS_MAP[cardKey];
      const content = tooltips[tooltipId];
  
      if (content) {
        setModalTitle(title);
        setModalContent(content);
        setIsModalOpen(true);
      } else {
        setModalTitle('Información no disponible');
        setModalContent('No se encontró una descripción detallada para este indicador.');
        setIsModalOpen(true);
      }
    };
  

  // Fetch indicadores hidráulicos
  const { data: hidroData, isLoading: loadingHidro } = useHidrologiaHidraulicos();
  
  useEffect(() => {
    if (!hidroData) return;
    
    setLoadingIdx(true);
    try {
      const j = hidroData;

      const asNum = (v) => {
        const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      const fecha = j.fecha;
      const [yy, mm, dd] = String(fecha || '').split('-');
      const updatedEmbalse = (yy && mm && dd) ? `${dd.padStart(2,'0')}/${mm.padStart(2,'0')}/${yy}` : '—';

      const volUtil = asNum(j.volumen_util_gwh);
      const pctUtil = asNum(j.porcentaje_util);
      const difVol = asNum(j.dif_volumen_diario);
      const difPct = asNum(j.dif_porcentaje_diario);

      const mes = asNum(j.mes);
      const anio = asNum(j.año ?? j.anio ?? j.year);
      const aportesProm = asNum(j.aportes_mensual_promedio);
      const aportesPctRaw = asNum(j.aportes_porcentaje_mensual);
      const mediaHist = asNum(j.aportes_media_historica);
      const difAportes = asNum(j.dif_aportes_mensual);
      const difAportesPctRaw = asNum(j.dif_aportes_porcentaje_mensual);
      const normalizePct = (x) => (!Number.isFinite(x) ? NaN : (x <= 1 ? x * 100 : x));

      const aportesPct = normalizePct(aportesPctRaw);
      const difAportesPct = normalizePct(difAportesPctRaw);

      const i0 = {
        title: 'Nivel de embalse actual',
        updated: updatedEmbalse,
        value: fmtGwh(volUtil),
        deltaText: fmtSigned(difVol, ' GWh'),
        deltaDir: dirFrom(difVol),
        pct: fmtPct(pctUtil),
        pctDeltaText: fmtSigned(difPct, '%'),
        pctDeltaDir: dirFrom(difPct),
        pctValueNum: Number.isFinite(pctUtil) ? pctUtil : 0,
      };

      const i1 = {
        title: 'Aportes mensuales promedio',
        updated: (Number.isFinite(mes) && Number.isFinite(anio)) ? `${monthEs(mes)} ${anio}` : '—',
        value: fmtGwh(aportesProm),
        deltaText: fmtSigned(difAportes, ' GWh'),
        deltaDir: dirFrom(difAportes),
        pct: fmtPct(aportesPct),
        pctDeltaText: fmtSigned(difAportesPct, '%'),
        pctDeltaDir: dirFrom(difAportesPct),
        sub: `Media histórica: ${fmtGwh(mediaHist)}`,
      };

      setIndices((prev) => {
        const copy = [...prev];
        copy[0] = i0;
        copy[1] = i1;
        return copy;
      });
    } catch (e) {
      console.error('[Hidrologia] Error cargando indicadores:', e);
      setIndices((prev) => {
        const copy = [...prev];
        copy[0] = { ...prev[0], updated: 'Error al cargar', value: '—', pct: '—', pctValueNum: 0, deltaText: '—', pctDeltaText: '—' };
        copy[1] = { ...prev[1], updated: 'Error al cargar', value: '—', pct: '—', sub: 'Media histórica: —', deltaText: '—', pctDeltaText: '—' };
        return copy;
      });
    } finally {
      setLoadingIdx(false);
    }
  }, [hidroData]);

// Generación promedio diaria (Hídrica, Térmica, FNCER) + Demanda real
  const { data: generacionData } = useHidrologiaGeneracion();
  
  useEffect(() => {
    if (!generacionData) return;
    
    try {
      const j = generacionData;

      const monthEs = (m) => ([
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
      ][Math.max(0, Math.min(11, (m|0)-1))] || '—');

      const labelCompare = (mAct, mAnt) => {
        const [yA, mA] = String(mAct || '').split('-').map(Number);
        const [yB, mB] = String(mAnt || '').split('-').map(Number);
        if (Number.isFinite(mA) && Number.isFinite(mB)) {
          // si cambia de año, muestro ambos años; si no, muestro uno
          return yA === yB
            ? `${monthEs(mA)} vs ${monthEs(mB)} ${yA}`
            : `${monthEs(mA)} ${yA} vs ${monthEs(mB)} ${yB}`;
        }
        return '—';
      };

      const tarr = Array.isArray(j.generacion_por_tecnologia) ? j.generacion_por_tecnologia : [];
      const tmap = Object.fromEntries(
        tarr.map(t => [String(t.tecnologia || '').toUpperCase(), t])
      );

      const fmtNum = (v) => Number.isFinite(v) ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '—';
      const mkDelta = (abs, pct) =>
        (Number.isFinite(abs) && Number.isFinite(pct))
          ? `${abs >= 0 ? '+' : ''}${fmtNum(abs)} GWh (${pct >= 0 ? '+' : ''}${fmtNum(pct)}%)`
          : '—';
      const dirFrom = (v) => (Number.isFinite(v) && v < 0 ? 'down' : 'up');

      const gH = tmap['HIDRAULICA'] || {};
      const gT = tmap['TERMICA'] || {};
      const gF = tmap['FNCER'] || {};

      const groups = [
        { name: 'Hídrica', value: fmtNum(gH.mes_actual), unit: 'GWh-día', delta: mkDelta(gH.diff_abs, gH.diff_pct), dir: dirFrom(gH.diff_abs), identifier: 'hidro_card_generacion_hidrica' },
        { name: 'Térmica', value: fmtNum(gT.mes_actual), unit: 'GWh-día', delta: mkDelta(gT.diff_abs, gT.diff_pct), dir: dirFrom(gT.diff_abs), identifier: 'hidro_card_generacion_termica' },
        { name: 'FNCER',   value: fmtNum(gF.mes_actual), unit: 'GWh-día', delta: mkDelta(gF.diff_abs, gF.diff_pct), dir: dirFrom(gF.diff_abs), identifier: 'hidro_card_generacion_fncer' },
      ];

      const dr = j.demanda_real || {};
      const demAct = Array.isArray(dr.mes_actual) ? dr.mes_actual[0] : undefined;
      const demDiffAbs = Array.isArray(dr.diff_abs) ? dr.diff_abs[0] : undefined;
      const demDiffPct = Array.isArray(dr.diff_pct) ? dr.diff_pct[0] : undefined;

      const bottom = `Demanda real promedio: ${fmtNum(demAct)} GWh – día`;
      const bottomDelta = mkDelta(demDiffAbs, demDiffPct);
      const bottomDir = dirFrom(demDiffAbs);

      const updated = labelCompare(j.mes_actual, j.mes_anterior);

      setIndices(prev => {
        const copy = [...prev];
        copy[2] = {
          title: 'Generación promedio diaria',
          updated,
          groups,
          bottom,
          bottomDelta,
          bottomDir,
        };
        return copy;
      });
    } catch (e) {
      console.error('[Hidrologia] Error cargando generación:', e);
      setIndices(prev => {
        const copy = [...prev];
        copy[2] = { ...prev[2], updated: 'Error al cargar' };
        return copy;
      });
    }
  }, [generacionData]);

  // Precios de energía (mínimo/promedio/máximo) + precio marginal de escasez
  const { data: preciosData } = useHidrologiaPrecios();
  
  useEffect(() => {
    if (!preciosData) return;
    
    try {
      const arr = Array.isArray(preciosData) ? preciosData : [preciosData];
      const j = arr.length ? arr[0] : null;
      if (!j) return;

      const fmtNum = (v) =>
        Number.isFinite(v) ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '—';
      const mkDelta = (abs, pct) =>
        (Number.isFinite(abs) && Number.isFinite(pct))
          ? `${abs >= 0 ? '+' : ''}${fmtNum(abs)} (${pct >= 0 ? '+' : ''}${fmtNum(pct)}%)`
          : '—';
      const dirFrom = (v) => (Number.isFinite(v) && v < 0 ? 'down' : 'up');

      // Título dinámico según meses
      const labelCompare = (mAct, mAnt) => {
        const [yA, mA] = String(mAct || '').split('-').map(Number);
        const [yB, mB] = String(mAnt || '').split('-').map(Number);
        if (Number.isFinite(mA) && Number.isFinite(mB)) {
          return yA === yB
            ? `${monthEs(mA)} vs ${monthEs(mB)} ${yA}`
            : `${monthEs(mA)} ${yA} vs ${monthEs(mB)} ${yB}`;
        }
        return '—';
      };

      const groups = [
        {
          name: 'Mínimo\nDiario',
          value: fmtNum(j.minimo_promedio_diario_actual),
          unit: 'COP/kWh',
          delta: mkDelta(j.diff_abs_minimo, j.diff_pct_minimo),
          dir: dirFrom(j.diff_abs_minimo),
          identifier: 'hidro_card_minimo_diario'
        },
        {
          name: 'Promedio\nDiario',
          value: fmtNum(j.promedio_diario_mes_actual),
          unit: 'COP/kWh',
          delta: mkDelta(j.diff_abs_promedio, j.diff_pct_promedio),
          dir: dirFrom(j.diff_abs_promedio),
          identifier: 'hidro_card_promedio_diario'
        },
        {
          name: 'Máximo\nDiario',
          value: fmtNum(j.maximo_promedio_diario_actual),
          unit: 'COP/kWh',
          delta: mkDelta(j.diff_abs_maximo, j.diff_pct_maximo),
          dir: dirFrom(j.diff_abs_maximo),
          identifier: 'hidro_card_maximo_diario'
        },
      ];

      const title = `Precios de energía – ${labelCompare(j.mes_actual, j.mes_anterior)}`;
      const updated = 'Promedios mensuales diarios (COP/kWh)';
      const badge = 'Precio marginal de escasez';
      const badgeValue = `${fmtNum(j.precio_marginal_escasez)} COP/kWh`;

      setIndices((prev) => {
        const copy = [...prev];
        copy[3] = { title, updated, groups, badge, badgeValue };
        return copy;
      });
    } catch (e) {
      console.error('[Hidrologia] Error cargando precios de energía:', e);
      setIndices((prev) => {
        const copy = [...prev];
        copy[3] = { ...prev[3], title: 'Precios de energía', updated: 'Error al cargar' };
        return copy;
      });
    }
  }, [preciosData]);

  // Ref del contenido a imprimir (API v3)
  const printRef = useRef(null);

  // Estilos de impresión
  const pageStyle = `
    @page { size: A4 portrait; margin: 12mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
    .avoid-break, .rounded-xl, .highcharts-container, .leaflet-container {
      break-inside: avoid; page-break-inside: avoid;
    }
    iframe { width: 100% !important; border: 1px solid #e5e7eb; }
    .shadow, .shadow-md, .shadow-soft { box-shadow: none !important; }
    body { font-family: Nunito Sans, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  `;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'hidrologia',
    pageStyle,
    copyStyles: true,
    removeAfterPrint: true,
  });

  // ---- Descargar PDF (html2canvas + jsPDF) ----
const [downloading, setDownloading] = useState(false);

const handleDownloadPdf = async () => {
  if (!printRef.current || downloading) return;
  setDownloading(true);
  try {
    // Asegura calidad en pantallas HiDPI
    const scale = Math.max(2, window.devicePixelRatio || 1);

    // Captura el nodo completo
    const canvas = await html2canvas(printRef.current, {
      backgroundColor: tokens.colors.surface.primary,   // respeta el fondo dark
      scale,
      useCORS: true,
      logging: false,
      // html2canvas ya soporta SVG; foreignObject mejora algunos casos
      foreignObjectRendering: true,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    // Configura PDF A4 (mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Ajuste de escala manteniendo proporción
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Si ocupa más de una página, la partimos “desplazando” el alto
    let position = 0;
    let remaining = imgHeight;

    // Tip: usamos la misma imagen, pero movemos el “recorte” con addImage options
    // jsPDF no recorta, así que hacemos paginado por “slice” dibujando el mismo bitmap
    // en offsets verticales.
    // Para calidad y performance, convertimos a px->mm con la misma proporción.
    const pxPageHeight = Math.floor((pageHeight * canvas.width) / pageWidth); // alto equivalente en px por página
    let sY = 0;

    while (remaining > 0) {
      // Crea un canvas “slice” por página
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width  = canvas.width;
      pageCanvas.height = Math.min(pxPageHeight, canvas.height - sY);

      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        0, sY,                    // src x,y
        canvas.width, pageCanvas.height, // src w,h
        0, 0,                     // dst x,y
        canvas.width, pageCanvas.height  // dst w,h
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const pageImgHeight = (pageCanvas.height * imgWidth) / canvas.width;

      if (position > 0) pdf.addPage();
      pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeight, undefined, 'FAST');

      remaining -= pageImgHeight;
      sY += pageCanvas.height;
      position += pageImgHeight;
    }

    pdf.save('hidrologia.pdf');
  } catch (e) {
    console.error('[PDF] Error generando PDF:', e);
    alert('No se pudo generar el PDF. Revisa la consola para más detalles.');
  } finally {
    setDownloading(false);
  }
};


  return (
    <>
      <style>{`@media print { ${pageStyle} }`}</style>

      <section className="space-y-6" ref={printRef}>
        <Banner>
          <BannerBackground
            src={bannerHidrologia}
            title="Banner Background"
            alt="Banner Background"
          />
          <BannerHeader>
            <BannerTitle>Seguimiento Hidrológico</BannerTitle>
            <BannerAction>
              <a onClick={handlePrint}>Descargar PDF</a>
            </BannerAction>
          </BannerHeader>
        </Banner>

        {/* ÍNDICES */}
        <h2 className="text-2xl font-semibold text-gray-300 avoid-break">Índices</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl p-4 avoid-break">
          <TitleRow title="Nivel de embalse actual" updated={indices[0].updated} />

          {/* Fila: valor GWh con chip a la derecha */}
          <div className="flex items-center justify-between">
            <p className="text-white text-xl">{indices[0].value}</p>

            <div className="flex items-center gap-2">
            <TrendChip dir={indices[0].deltaDir}>{indices[0].deltaText}</TrendChip>
            <HelpCircle
                    className="text-white cursor-pointer hover:text-gray-300 bg-neutral-700 self-center rounded h-6 w-6 p-1 "
                    title="Ayuda"
                    onClick={() => handleHelpClick('hidro_card_embalse_dia', 'Nivel de embalse actual')}
                  />
            </div>
          </div>

          {/* Divisor */}
          <div className="my-3 h-px w-full bg-[#3a3a3a]" />

          {/* Fila: % con chip a la derecha */}
          <div className="flex items-center justify-between">
            <div className="text-gray-300 text-xl">{indices[0].pct}</div>

            <div className="flex items-center gap-2">
            <TrendChip dir={indices[0].pctDeltaDir}>{indices[0].pctDeltaText}</TrendChip>

             <HelpCircle
                    className="text-white cursor-pointer hover:text-gray-300 bg-neutral-700 self-center rounded h-6 w-6 p-1 "
                    title="Ayuda"
                    onClick={() => handleHelpClick('hidro_card_embalse_porcentaje', 'Nivel de embalse actual')}
                  />
          </div>
          </div>

          {/* Barra de nivel */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-surface-secondary border border-[color:var(--border-subtle)]">
              <div
                className="h-3"
                style={{
                  width: `${Math.max(0, Math.min(100, indices[0].pctValueNum || 0))}%`,
                  background: COLORS.blue
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl p-4 avoid-break">
          <TitleRow
            title="Aportes mensuales promedio"
            updated={indices[1].updated}
            icon={OfertaDemandaIcon}
          />

          {/* Fila: valor GWh con chip a la derecha */}
          <div className="flex items-center justify-between">
            <p className="text-white text-xl">{indices[1].value}</p>

            <div className="flex items-center gap-2">
            <TrendChip dir={indices[1].deltaDir}>{indices[1].deltaText}</TrendChip>
             <HelpCircle
                    className="text-white cursor-pointer hover:text-gray-300 bg-neutral-700 self-center rounded h-6 w-6 p-1"
                    title="Ayuda"
                    onClick={() => handleHelpClick('hidro_card_aporte_mensuales_dia', 'Aportes mensuales promedio')}
                  />
                </div>
          </div>

          {/* Divisor */}
          <div className="my-3 h-px w-full bg-[#3a3a3a]" />

          {/* Fila: % con chip a la derecha */}
          <div className="flex items-center justify-between">
            <p className="text-white text-xl">{indices[1].pct}</p>

            <div className="flex items-center gap-2">
            <TrendChip dir={indices[1].pctDeltaDir}>{indices[1].pctDeltaText}</TrendChip>
             <HelpCircle
                    className="text-white cursor-pointer hover:text-gray-300 bg-neutral-700 self-center rounded h-6 w-6 p-1"
                    title="Ayuda"
                    onClick={() => handleHelpClick('hidro_card_aporte_mensuales_porcentaje', 'Aportes mensuales promedio')}
                  />

            </div>
          </div>

          {/* Media histórica */}
          <div className="text-xs text-gray-400 mt-2">{indices[1].sub}</div>
        </div>

          {/* Card 3 */}
          <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl p-4 avoid-break">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-gray-300">Generación promedio diaria</span>
              <span className="text-xs text-gray-400">{indices[2].updated}</span>
            </div>

            <div className="grid  sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {indices[2].groups.map((g) => {
                let customIcon = null;
                if (g.name === 'Hídrica') customIcon = hidrologiaIcon;
                if (g.name === 'Térmica') customIcon = GeneracionTermicaIcon;
                if (g.name === 'FNCER') customIcon = AutogeneracionIcon;

                return (
                  <MiniStatTile
                    key={g.name}
                    name={g.name}
                    value={g.value}
                    unit={g.unit}
                    delta={g.delta}
                    dir={g.dir}
                    icon={customIcon}
                    onHelpClick={() => handleHelpClick(g.identifier, g.name)}
                  />
                );
              })}
              
            </div>

            <div className="mt-4 rounded-lg border border-[color:var(--border-subtle)] p-3">
               <div className="flex items-center gap-2">
              <div className="text-white">{indices[2].bottom}</div>
            
               
                <TrendChip dir={indices[2].bottomDir}>{indices[2].bottomDelta}</TrendChip>
                 <HelpCircle
                    className="text-white cursor-pointer hover:text-gray-300 bg-neutral-700 self-center rounded h-6 w-6 p-1"
                    title="Ayuda"
                    onClick={() => handleHelpClick('hidro_card_generacion_demanda_real', 'Demanda real promedio')}
                  />
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl p-4 avoid-break">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-gray-300">{indices[3].title}</span>
              <span className="text-xs text-gray-400">{indices[3].updated}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {indices[3].groups?.map((g) => {
                let customIcon = null;
                if (g.name.includes('Mínimo')) customIcon = arrowUpDarkmodeAmarilloIcon;
                if (g.name.includes('Promedio')) customIcon = arrowsDarkmodeAmarilloIcon;
                if (g.name.includes('Máximo')) customIcon = arrowUpDarkmodeAmarilloIcon;

                return (
                  <MiniStatTile
                    key={g.name}
                    name={g.name}
                    value={g.value}
                    unit={g.unit}
                    delta={g.delta}
                    dir={g.dir}
                    icon={customIcon}
                    multilineName
                    onHelpClick={() => handleHelpClick(g.identifier, g.name.replace('\n', ' '))}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-lg px-4 py-3 font-semibold bg-[#FFC800] text-[#111827] inline-flex items-center justify-between"
              aria-label={`${indices[3].badge}: ${indices[3].badgeValue}`}
            >
              <span className="inline-flex items-center gap-2">
                {indices[3].badge}
              </span>
              <span className="text-base">{indices[3].badgeValue}</span>
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl avoid-break flex flex-col-reverse lg:flex-row overflow-hidden">
            <SideInfoHidrologia />
            <DamMap/>
        </div>

        {/* Tabla + Gráfica Aportes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HidroTabs data={hidroRows} regionSummary={regionSummary} />
          <div className="w-full bg-surface-primary p-4 pb-10 rounded-lg border border-[color:var(--border-default)] shadow relative">
            {/* Ayuda */}
            <button
              className="absolute top-[25px] right-[60px] z-10 flex items-center justify-center bg-[#444] rounded-lg shadow hover:bg-[#666] transition-colors"
              style={{ width: 30, height: 30 }}
              title="Ayuda"
              onClick={() => handleHelpClick('hidro_grafica_aporte_nivel_util_embalse_mes', 'Aportes y nivel útil de embalses por mes')}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="rounded-full">
                <circle cx="12" cy="12" r="10" fill="#444" stroke="#fff" strokeWidth="2.5" />
                <text x="12" y="18" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold" fontFamily="Nunito Sans, sans-serif">?</text>
              </svg>
            </button>
            <HighchartsReact highcharts={Highcharts} options={aportesOptions} />
          </div>
        </div>

        {/* Estatuto de desabastecimiento */}
        <div className="w-full bg-surface-primary p-4 pb-10 rounded-lg border border-[color:var(--border-default)] shadow relative">
        {/* Ayuda */}
        <button
          className="absolute top-[25px] right-[60px] z-10 flex items-center justify-center bg-[#444] rounded-lg shadow hover:bg-[#666] transition-colors"
          style={{ width: 30, height: 30 }}
          title="Ayuda"
          onClick={() => handleHelpClick('hidro_grafica_estatuto_desabastecimiento', 'Estatuto de desabastecimiento')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="rounded-full">
            <circle cx="12" cy="12" r="10" fill="#444" stroke="#fff" strokeWidth="2.5" />
            <text x="12" y="18" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold" fontFamily="Nunito Sans, sans-serif">?</text>
          </svg>
        </button>
          
          <HighchartsReact highcharts={Highcharts} options={desabOptions} />
          {/* *** COMPONENTE TOOLTIP MODAL *** */}
                  <TooltipModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={modalTitle}
                    content={modalContent}
                  />
        </div>
      </section>
    </>
  );
}
