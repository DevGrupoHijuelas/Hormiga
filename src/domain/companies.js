// Empresas, columnas de la plantilla DTW y reglas automáticas (tomadas de las fórmulas del Excel
// "Maestro Articulo PR"). Cada columna tiene:
//   who:  "user" (lo llena el usuario, amarillo) | "auto" (regla del Excel) | "admin" (lo completa el admin)
//   req:  obligatorio para exportar        max:  largo máximo
//   kind: tipo de control (group, yn, glm, bis, dim)      upper: guardar en mayúsculas
//   f(r, e): regla automática; r.g = código de grupo, e = valores ya calculados de columnas anteriores
//   init: valor inicial para el usuario    def: valor por defecto tomado de la configuración

export const YN = ["", "tYES", "tNO"];
export const GLM = ["", "glm_ItemClass", "glm_WH", "glm_ItemLevel"];
export const BIS = ["", "bis_MovingAverage", "bis_Standard", "bis_FIFO"];

const inG = (r, ...groups) => groups.map(String).includes(r.g);
const C = (code, label, opts) => ({ code, label, ...opts });

const colsHGVH = (variant) => [
  C("ItemCode", "Número de artículo", { who: "admin", req: true, max: 50, upper: true }),
  C("ItemName", "Descripción del artículo", { who: "user", req: true, max: 200, upper: true }),
  C("ItemsGroupCode", "Grupo de artículos", { who: "user", req: true, kind: "group" }),
  C("VatLiable", "Sujeto a impuesto", { who: "auto", req: true, kind: "yn", f: (r) => (r.g ? "tYES" : "") }),
  C("PurchaseItem", "Artículo de compra", {
    who: "auto", req: true, kind: "yn",
    f: variant === "VH"
      ? (r) => (inG(r, 115, 116) ? "tYES" : inG(r, 117, 118) ? "tNO" : "")
      : (r) => (r.g ? "tYES" : ""),
  }),
  C("SalesItem", "Artículo venta", {
    who: "auto", req: true, kind: "yn",
    f: variant === "VH"
      ? (r) => (inG(r, 115, 116) ? "tYES" : inG(r, 117, 118) ? "tNO" : "")
      : (r) => (r.g ? "tYES" : ""),
  }),
  C("InventoryItem", "Artículo de inventario", { who: "auto", req: true, kind: "yn", f: (r) => (r.g ? "tYES" : "") }),
  C("SalesUnit", "Unidad de medida de ventas", {
    who: "auto", max: 100,
    f: variant === "VH" ? (r) => (inG(r, 115, 116) ? "UN" : "") : (r) => (r.g ? "UN" : ""),
  }),
  C("PurchaseUnit", "Unidad de medida de compras", {
    who: "auto", max: 40,
    f: variant === "VH" ? (r) => (inG(r, 115, 116) ? "UN" : "") : (r) => (r.g ? "UN" : ""),
  }),
  C("InventoryUOM", "Unidad de medida de inventario", { who: "auto", max: 40, f: (r) => (r.g ? "UN" : "") }),
  C("DefaultWarehouse", "Almacen por Defecto", { who: "admin", max: 8, def: "almacen" }),
  C("GLMethod", "Cuenta de Mayor según", { who: "auto", req: true, kind: "glm", f: (r) => (r.g ? "glm_ItemClass" : "") }),
  C("CostAccountingMethod", "Método de valoración", { who: "auto", req: true, kind: "bis", f: (r) => (r.g ? "bis_MovingAverage" : "") }),
  // Solo H&G usa dimensiones: 1 y 3 son fijas, 2 la elige el usuario de una lista.
  ...(variant === "HG"
    ? [
        C("U_VK_DIM1", "Dimension 1", { who: "auto", kind: "dim", max: 8, f: () => "001" }),
        C("U_VK_DIM2", "Dimension 2", { who: "user", req: true, kind: "dim", max: 8 }),
        C("U_VK_DIM3", "Dimension 3", { who: "auto", kind: "dim", max: 8, f: () => "015" }),
      ]
    : []),
];

const colsISL = [
  C("ItemCode", "Número de artículo", { who: "user", req: true, max: 50, upper: true }),
  C("ItemName", "Descripción del artículo", { who: "user", req: true, max: 200, upper: true }),
  C("ItemsGroupCode", "Grupo de artículos", { who: "user", req: true, kind: "group" }),
  C("VatLiable", "Sujeto a impuesto", { who: "auto", req: true, kind: "yn", f: (r) => (r.g ? "tYES" : "") }),
  C("PurchaseItem", "Artículo de compra", {
    who: "auto", req: true, kind: "yn",
    f: (r) => (inG(r, 198, 210) ? "tNO" : inG(r, 200, 209) ? "tNO" : inG(r, 201, 207) ? "tYES" : ""),
  }),
  C("SalesItem", "Artículo venta", {
    who: "auto", req: true, kind: "yn",
    f: (r) => (inG(r, 198, 210) ? "tYES" : inG(r, 200, 209) ? "tNO" : inG(r, 201, 207) ? "tNO" : ""),
  }),
  C("InventoryItem", "Artículo de inventario", { who: "auto", req: true, kind: "yn", f: (r, e) => (e.SalesItem !== "" ? "tYES" : "") }),
  C("SalesUnit", "Unidad de medida de ventas", { who: "auto", max: 100, f: (r) => (r.g ? "NIU" : "") }),
  C("PurchaseUnit", "Unidad de medida de compras", { who: "auto", max: 40, f: (r) => (r.g ? "NIU" : "") }),
  C("InventoryUOM", "Unidad de medida de inventario", { who: "auto", max: 40, f: (r) => (r.g ? "NIU" : "") }),
  C("ManageBatchNumbers", "Gestion de Lotes", { who: "auto", kind: "yn", f: (r) => (r.g ? "tYES" : "") }),
  C("ManSerNum", "Metodo de gestion", { who: "auto", f: (r) => (r.g ? "A" : "") }),
  C("GLMethod", "Cuenta de Mayor según", { who: "auto", req: true, kind: "glm", f: (r) => (r.g ? "glm_ItemClass" : "") }),
  C("CostAccountingMethod", "Método de valoración", { who: "auto", req: true, kind: "bis", f: (r) => (r.g ? "bis_MovingAverage" : "") }),
  C("U_BPP_Variedad_MA", "BBP Variedad", { who: "user", max: 100, upper: true }),
  C("U_BPP_TIPEXIST", "BBP Tipo Existencia", {
    who: "auto",
    f: (r) => (inG(r, 198, 210, 201, 207) ? "02" : inG(r, 200, 209) ? "03" : ""),
  }),
  C("U_BPP_TIPUNMED", "BPP Tipo Unidad de Medida", { who: "auto", f: (r) => (r.g ? "NIU" : "") }),
  C("U_BPP_CATEX", "Catalogo de Existencias", { who: "auto", f: (r) => (r.g ? "3" : "") }),
  C("U_VKP_Csunat", "Codigo Sunat", { who: "user", max: 20, init: "10101500" }),
];

export const COMPANIES = {
  HG: { key: "HG", short: "H&G", name: "Hijuelas Home & Garden", sheet: "01 - Artículos (H&G)", cols: colsHGVH("HG") },
  VH: { key: "VH", short: "VH", name: "Viveros Hijuelas", sheet: "02 - Artículos (VH)", cols: colsHGVH("VH") },
  ISL: { key: "ISL", short: "ISL", name: "Inversiones San Juan de la Luz", sheet: "3 - Articulos (ISL)", cols: colsISL },
};
export const EMP_KEYS = Object.keys(COMPANIES);

// Catálogos por defecto. Las listas son pares [código, nombre].
export const DEFAULT_CONFIG = {
  grupos: {
    HG: [["121", "P. Terminado Ornamental"]],
    VH: [["115", "P. Terminado FRU"], ["116", "P. Terminado ORN"], ["117", "Semi Elab Ornamental"], ["118", "Semi Elab Frutal"]],
    ISL: [
      ["191", "Envase"], ["198", "P. Terminado FRU"], ["200", "P. Semi Elab FRU - Envase"], ["201", "Plantas Importadas Frutal"],
      ["207", "Plantas Importadas Ornamental"], ["209", "P. Semi Elab Ornamental - Envase"], ["210", "P. Terminado Ornamental"],
    ],
  },
  dims: {
    HG: {
      U_VK_DIM1: [["001", ""]],
      U_VK_DIM2: [["002", "EXTERIOR"], ["003", "INTERIOR"], ["004", "MULTIAMBIENTE"]],
      U_VK_DIM3: [["015", ""]],
    },
  },
  almacen: { HG: "", VH: "", ISL: "" },
};

export const DIM_CODES = ["U_VK_DIM1", "U_VK_DIM2", "U_VK_DIM3"];
export const hasDims = (emp) => COMPANIES[emp].cols.some((c) => c.kind === "dim");
