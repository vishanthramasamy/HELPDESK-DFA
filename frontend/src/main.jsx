import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './style.css';

function Home() {
  return <main><header><div className="brand">HELPDESK <span>• DFA LIFECYCLE</span></div><nav><Link to="/">Overview</Link><Link to="/health">API Status</Link></nav></header><section className="hero"><p className="eyebrow">ONLINE SUPPORT OPERATIONS</p><h1>Every ticket has<br/><em>a clear path forward.</em></h1><p className="intro">A helpdesk lifecycle system where backend DFA rules guide tickets from opening to resolution.</p><Link className="button" to="/health">Check API connection <b>↗</b></Link></section><section className="cards"><article><small>01 / INTAKE</small><h2>Capture the request</h2><p>Record support needs with structured details and priority.</p></article><article><small>02 / CONTROL</small><h2>Follow valid states</h2><p>Lifecycle changes are validated by the server’s DFA.</p></article><article><small>03 / VISIBILITY</small><h2>Keep an audit trail</h2><p>History shows who changed each ticket and when.</p></article></section><footer>Deployment starter · Configure API URL before production</footer></main>
}
function ApiStatus() {
 const [state, setState] = React.useState('Checking…'); const [meta, setMeta] = React.useState('');
 const check = async () => { const start = performance.now(); try { const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/health`); const data = await response.json(); setState(response.ok ? 'Backend reachable' : 'Backend returned an error'); setMeta(`HTTP ${response.status} · ${Math.round(performance.now()-start)} ms · ${data.status || 'response received'}`); } catch { setState('Backend unavailable'); setMeta('Check VITE_API_URL and the backend service.'); } };
 React.useEffect(() => { check(); }, []);
 return <main><header><div className="brand"><Link to="/">HELPDESK</Link> <span>• CONNECTIVITY</span></div></header><section className="hero compact"><p className="eyebrow">NETWORK CHECK</p><h1>API <em>status</em></h1><p className="intro">Configured endpoint: <code>{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</code></p><article className="status"><strong>{state}</strong><p>{meta}</p><button className="button" onClick={check}>Check again ↻</button></article></section></main>
}
function App(){return <BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/health" element={<ApiStatus/>}/><Route path="*" element={<Home/>}/></Routes></BrowserRouter>}

createRoot(document.getElementById('root')).render(<App/>);
