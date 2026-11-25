import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";

export default function Toast() {
  const { toastMsg } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toastMsg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), toastMsg.err ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  return (
    <div className="toasts" aria-live="polite">
      {toastMsg && visible && (
        <div key={toastMsg.id} className={"toast" + (toastMsg.err ? " err" : "")} role="status">
          {toastMsg.err ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
          <span>{toastMsg.msg}</span>
        </div>
      )}
    </div>
  );
}
