import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer } from "react-leaflet";

import { Dialog, DialogContent, DialogTrigger } from "./ui/Dialog";

import EMBALSES_URL from "../assets/geojson/EmbalsesJson.geojson?url";
import REGIONES_URL from "../assets/geojson/RegionesHidro.geojson?url";

const NOMBRE_KEY = "Nombre_del_embalse";
const VU_MM3_KEY = "Volumen_útil___Mm3_";
const VU_GWH_KEY = "Volumen_útil___GWh_";

const regionBackground = {
  antioquia: "#9168EA",
  caldas: "#F06B6B",
  caribe: "#3B82F6",
  centro: "#F97316",
  oriente: "#FFC800",
  valle: "#32BF6F",
};

const TrendChip = ({ dir = 'up', children }) => {
  const isUp = dir === 'up';
  const bg = isUp ? '#22C55E' : '#EF4444';
  return (
    <span
      className="
        inline-flex items-center px-3 py-0.5 ml-2
        rounded-full text-sm font-semibold
        whitespace-nowrap leading-none
      "
      style={{
        backgroundColor: bg,
        color: '#fff',
        border: '1px solid rgba(0,0,0,.15)',
      }}
    >
      <span aria-hidden className="text-base leading-none">{isUp ? '+' : '-'}</span>
      <span className="leading-none" style={{ color: '#fff' }}>{children}</span>
    </span>
  );
}

function fmtNum(val, suf) {
  const n = Number(val);
  return Number.isFinite(n)
    ? n.toLocaleString("es-CO", { maximumFractionDigits: 2 }) +
        (suf ? " " + suf : "")
    : "N/D";
}

const RegionDialog = ({ coords, damProperties }) => {
  const [open, setOpen] = useState(false);

  const region = damProperties["Región__hidrológica"];
  const color = region ? regionBackground[region.toLowerCase()] : '#22c55e';

  const name = damProperties[NOMBRE_KEY] ?? "Sin Nombre";
  const vmm3 = fmtNum(damProperties[VU_MM3_KEY], "Mm³"); // Volumen
  const vgwh = fmtNum(damProperties[VU_GWH_KEY], "GWh"); // Aportes hídricos
  const date = "23/08/2025"; // Fecha
  const damLevel = 70; // %
  const damCapacity = 23;
  const damCapacityGeneration = 15.2;
  const damWaterSupply = 198.2;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <CircleMarker
          center={[coords[1], coords[0]]}
          radius={6}
          pathOptions={{
            color: "#000",
            fillColor: color,
            weight: 1.4,
            fillOpacity: 0.9,
          }}
          eventHandlers={{
            click: () => {
              setOpen(true);
            },
          }}
        />
      </DialogTrigger>
      <DialogContent>
        {/* ! Contenido */}
        <div className="p-4 space-y-3">
          <div>
            <div className="flex justify-between">
              <h3 className="text-white text-lg font-bold tracking-wide justify-self-start">
                {name}
              </h3>
              <span
                className="rounded-full border-none text-[11px] text-gray-200 py-2 px-3 mr-2"
                style={{
                  backgroundColor: color,
                  mixBlendMode: "difference",
                  color: "white",
                }}
              >
                Región: {region}
              </span>
            </div>
            <span className="text-[11px] text-[#b0b0b0]">
              Datos promedio {date}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xl">
            <div className="bg-white/5 border border-white/20 rounded-lg">
              <div className="flex justify-between p-3">
                <span className="block text-sm text-white">
                  Nivel embalses:
                </span>
                <span className="font-bold text-sm">{damLevel}%</span>
              </div>
              <div className="flex-1 h-3 rounded-sm overflow-hidden bg-[#575756] mx-3">
                <div
                  className="h-3"
                  style={{ width: `${damLevel}%`, background: "#22C55E" }}
                />
              </div>
            </div>
            <div className="bg-white/5 border border-white/20 rounded-lg p-3">
              <span className="block text-sm text-white">
                Aportes hídricos:
              </span>
              <span className="font-bold text-sm">{vgwh}</span>
            </div>
          </div>
          <div className="w-full">
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 text-sm flex justify-between">
              <span className="text-[13px]">● Volumen:</span>
              <span>
                {vmm3}
                <TrendChip dir={"up"}>2.5</TrendChip>
              </span>
            </div>
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 flex text-sm justify-between">
              <span className="text-[13px]">● Aportes hídricos:</span>
              <span>
                {damWaterSupply}
                <TrendChip dir={"down"}>2.5</TrendChip>
              </span>
            </div>
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 flex text-sm justify-between">
              <span className="text-[13px]">● Capacidad del embalse:</span>{" "}
              <span>{damCapacity}</span>
            </div>
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 flex text-sm justify-between">
              <span className="text-[13px]">● Recursos de generación:</span>{" "}
              <span>{name}</span>
            </div>
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 flex text-sm justify-between">
              <span className="text-[13px]">
                ● Capacidad del recurso de generación:
              </span>{" "}
              <span>{damCapacityGeneration}</span>
            </div>
            <div className="pl-1 p-4 border-b-[1px] border-[#575756]/50 flex text-sm justify-between">
              <span className="text-[13px]">● Aportes medios históricos:</span>{" "}
              <span>{damCapacityGeneration}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DamMap = () => {
  const [regiones, setRegiones] = useState(null);
  // * New state with data API, then search for information in the "regiones" array, if not info set a not found element
  const [embalses, setEmbalses] = useState(null);

  useEffect(() => {
    Promise.all([fetch(REGIONES_URL), fetch(EMBALSES_URL)])
      .then(async ([r1, r2]) => {
        const regionesJson = await r1.json();
        const embalsesJson = await r2.json();
        setRegiones(regionesJson);
        setEmbalses(embalsesJson);
      })
      .catch((err) => console.error("Error cargando GeoJSON:", err));
  }, []);

  return (
    <div className="max-h-[800px] h-screen  w-screen bg-[#0b1220] z-0 ">
      <MapContainer
        center={[4.6, -74.1]}
        zoom={6}
        className="h-full w-full"
        closePopupOnClick={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {regiones && (
          <GeoJSON
            data={regiones}
            style={(feature) => {
              const name = feature.properties.Region || null;
              const color = name ? regionBackground[name.toLowerCase()] : '#22c55e';

              return {
                color,
                weight: 1.4,
                fillColor: color,
                fillOpacity: 0.25,
              };
            }}
          />
        )}

        {embalses &&
          embalses.features.map((f, index) => {
            const coords = f.geometry.coordinates;

            console.log(f.properties)

            return (
              <RegionDialog
                key={index}
                coords={coords}
                damProperties={f.properties}
              />
            );
          })}
      </MapContainer>
    </div>
  );
}

export { DamMap };
