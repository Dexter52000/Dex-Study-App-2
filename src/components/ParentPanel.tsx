import { useEffect, useState } from "react";
import { auth, type Child } from "../auth";

interface Props {
  onClose: () => void;
  onEnterChildMode: (child: Child) => void;
  onAuthChange: (email: string | null) => void;
}

export default function ParentPanel({ onClose, onEnterChildMode, onAuthChange }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auth
      .me()
      .then((r) => setEmail(r.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, []);

  function setAuth(e: string | null) {
    setEmail(e);
    onAuthChange(e);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 style={{ margin: 0 }}>👪 家长中心</h2>
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <p className="muted">加载中……</p>
        ) : email ? (
          <LoggedIn
            email={email}
            onLogout={async () => {
              await auth.logout();
              setAuth(null);
            }}
            onEnterChildMode={onEnterChildMode}
            setError={setError}
          />
        ) : (
          <AuthForm onSuccess={(e) => setAuth(e)} setError={setError} />
        )}
      </div>
    </div>
  );
}

function AuthForm({
  onSuccess,
  setError,
}: {
  onSuccess: (email: string) => void;
  setError: (s: string | null) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = mode === "login"
        ? await auth.login(email, password)
        : await auth.register(email, password);
      onSuccess(r.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="explain-input">
      <p className="muted">
        家长账号用来管理孩子档案、设置每日使用上限、查看与删除数据。
      </p>
      <input
        type="email"
        placeholder="家长邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="密码(至少 8 位)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="row">
        <button type="button" className="btn-ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "没有账号?去注册" : "已有账号?去登录"}
        </button>
        <div className="spacer" />
        <button type="submit" className="btn-primary" disabled={busy}>
          {mode === "login" ? "登录" : "注册"}
        </button>
      </div>
    </form>
  );
}

function LoggedIn({
  email,
  onLogout,
  onEnterChildMode,
  setError,
}: {
  email: string;
  onLogout: () => void;
  onEnterChildMode: (child: Child) => void;
  setError: (s: string | null) => void;
}) {
  const [children, setChildren] = useState<Child[]>([]);

  async function refresh() {
    try {
      const r = await auth.listChildren();
      setChildren(r.children);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportChild(id: string, name: string) {
    try {
      const data = await auth.exportChild(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-data.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: "0.8rem" }}>
        <span className="muted">已登录:{email}</span>
        <div className="spacer" />
        <button className="btn-ghost" onClick={onLogout}>
          退出登录
        </button>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>孩子档案</div>
      {children.length === 0 ? (
        <p className="muted">还没有孩子档案。在下面创建一个。</p>
      ) : (
        <div className="deck-grid">
          {children.map((c) => (
            <div key={c.id} className="deck-card">
              <div className="row">
                <h3 style={{ margin: 0 }}>{c.name}</h3>
                <div className="spacer" />
                <span className="muted">{c.age} 岁 · {c.grade || "未填年级"}</span>
              </div>
              <p className="desc">
                每日上限:{c.dailyCallLimit > 0 ? `${c.dailyCallLimit} 次` : "不限"}
                {c.hasPin ? " · 已设 PIN" : ""}
              </p>
              <div className="row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
                <button className="btn-primary" onClick={() => onEnterChildMode(c)}>
                  进入孩子模式
                </button>
                <button className="btn-ghost" onClick={() => exportChild(c.id, c.name)}>
                  导出数据
                </button>
                <button
                  className="btn-ghost btn-danger"
                  onClick={async () => {
                    if (!window.confirm(`删除「${c.name}」的档案和全部数据?无法撤销。`)) return;
                    await auth.deleteChild(c.id);
                    refresh();
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateChildForm onCreated={refresh} setError={setError} />
    </div>
  );
}

function CreateChildForm({
  onCreated,
  setError,
}: {
  onCreated: () => void;
  setError: (s: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [grade, setGrade] = useState("");
  const [pin, setPin] = useState("");
  const [dailyCallLimit, setDailyCallLimit] = useState(20);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.createChild({ name, birthdate, grade, pin: pin || undefined, dailyCallLimit, consent });
      setName("");
      setBirthdate("");
      setGrade("");
      setPin("");
      setConsent(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="add-card-form">
      <div className="section-title" style={{ margin: 0 }}>新建孩子档案</div>
      <input placeholder="孩子名字 / 昵称" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="row">
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        <input placeholder="年级(如 6)" value={grade} onChange={(e) => setGrade(e.target.value)} />
      </div>
      <div className="row">
        <input
          placeholder="退出孩子模式的 PIN(可选)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <label className="muted" style={{ whiteSpace: "nowrap" }}>
          每日上限{" "}
          <input
            type="number"
            min={0}
            value={dailyCallLimit}
            onChange={(e) => setDailyCallLimit(Number(e.target.value))}
            style={{ width: "5rem", display: "inline-block" }}
          />{" "}
          次(0=不限)
        </label>
      </div>
      <label className="consent-row">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          我是该孩子的监护人,同意为其创建档案并记录学习与使用数据(不满 14 岁按敏感信息处理,可随时导出或删除)。
        </span>
      </label>
      <div className="row">
        <div className="spacer" />
        <button type="submit" className="btn-primary" disabled={busy || !consent}>
          创建档案
        </button>
      </div>
    </form>
  );
}
