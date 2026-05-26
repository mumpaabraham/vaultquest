export function Loader() {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );
}
