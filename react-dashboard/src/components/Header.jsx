import React, { useRef } from 'react';

export default function Header({ onUpload, onSample }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <h1>React Dashboard</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Загрузить Excel
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleChange} />
        <button className="btn btn-outline" onClick={onSample} style={{ borderColor: '#fff', color: '#fff' }}>
          Демо
        </button>
      </div>
    </header>
  );
}
