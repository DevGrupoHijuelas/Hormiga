import { FilePlus2 } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES } from "../domain/companies.js";
import { groupSolicitudes } from "../domain/solicitudes.js";
import { fmtDate } from "../domain/utils.js";
import AntIcon from "../components/AntIcon.jsx";
import ItemsTable from "../components/ItemsTable.jsx";
import SolTrack from "../components/SolTrack.jsx";
import { Empty, PageHeader } from "../components/Layout.jsx";

export default function MisSolicitudes({ go }) {
  const { items, me, config, empresas } = useApp();
  const mine = items.filter((i) => i.createdBy === me && empresas.includes(i.empresa));
  const sols = groupSolicitudes(mine, config);
  const count = { listo: 0, pendiente: 0, exportado: 0 };
  sols.forEach((s) => count[s.st]++);

  return (
    <>
      <PageHeader crumb={["Solicitudes"]} title="Mis solicitudes" lead="Cada envío es una solicitud con su propio número. Puedes corregir los campos amarillos hasta que el administrador cargue el artículo en SAP.">
        <button className="primary" onClick={() => go("nuevo")}><FilePlus2 size={16} /> Nueva solicitud</button>
      </PageHeader>

      {!mine.length ? (
        <Empty icon={AntIcon} title="Crea tu primera solicitud" action={<button className="primary" onClick={() => go("nuevo")}><FilePlus2 size={16} /> Nueva solicitud</button>}>
          Elige la empresa, completa los campos amarillos y envíala. Aquí verás su estado.
        </Empty>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><span>En revisión</span><b>{count.pendiente + count.listo}</b></div>
            <div className="kpi"><span>Cargados en SAP</span><b>{count.exportado}</b></div>
            <div className="kpi"><span>Total enviadas</span><b>{sols.length}</b></div>
          </div>
          {sols.map((sol) => (
            <section className={"card sol-emp emp-" + sol.emp} key={sol.id}>
              <header>
                <div className={"mono-mark emp-" + sol.emp} style={{ width: 38, height: 38, fontSize: 12 }}>{COMPANIES[sol.emp].short}</div>
                <div>
                  <h3 className="mono">Solicitud {sol.label}</h3>
                  <p className="sub">{COMPANIES[sol.emp].name} · {fmtDate(sol.createdAt)} · {sol.items.length} artículo{sol.items.length > 1 ? "s" : ""}</p>
                </div>
                <span className="spacer" />
                <span className={"pill " + (sol.st === "exportado" ? "exportado" : "revision")}>{sol.st === "exportado" ? "Cargada en SAP" : "En revisión"}</span>
              </header>
              <SolTrack sol={sol} />
              <ItemsTable emp={sol.emp} items={sol.items} />
            </section>
          ))}
        </>
      )}
    </>
  );
}
