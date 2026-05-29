import { useEffect, useState } from "react";

/** Eye-care nudge: in child mode, prompt a short break every ~20 minutes. */
export default function BreakReminder({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setShow(true), 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active || !show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 360, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>👀 休息一下</h2>
        <p>已经学了 20 分钟啦,起来活动一下、看看远处,保护眼睛~</p>
        <button className="btn-primary" onClick={() => setShow(false)}>
          好的
        </button>
      </div>
    </div>
  );
}
