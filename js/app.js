
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Scissors, Calendar, User, Home, Bell, Clock, ChevronRight, Star, LogOut, CheckCircle, X, Phone, Trash2, RefreshCw, Shield, DollarSign, AlertCircle, Smartphone, Zap, Search, Filter, Download, Plus, Edit2, Settings, TrendingUp, PieChart, Info, Lock, Unlock, CalendarOff, FileSpreadsheet, Check, Monitor, ArrowLeft, Save, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, updatePassword, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, deleteDoc, updateDoc, doc, onSnapshot, where, writeBatch, setDoc } from "firebase/firestore";
import firebaseConfig from './js/config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const getAppId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
};
const appId = getAppId();




const ADMIN_EMAIL = "admin@yoel.com";
const DEFAULT_TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"];
const DEFAULT_SERVICES = [
    { category: 'Corte', title: 'Corte Clásico', price: 500, duration: '45 min', description: 'Corte tradicional con tijera o máquina.', iconName: 'scissors' },
    { category: 'Corte', title: 'Fade / Degradado', price: 700, duration: '60 min', description: 'Degradado moderno con navaja.', iconName: 'scissors' },
    { category: 'Barba', title: 'Perfilado de Barba', price: 300, duration: '30 min', description: 'Alineación perfecta con navaja y toalla.', iconName: 'user' },
    { category: 'VIP', title: 'Experiencia Yoel', price: 1500, duration: '120 min', description: 'Corte, Barba, Mascarilla negra y Bebida de cortesía.', iconName: 'star' }
];
const ICON_MAP = { scissors: Scissors, user: User, star: Star, zap: Zap };
const getIcon = (name) => { const I = ICON_MAP[name] || Scissors; return <I className="w-6 h-6" />; };

// --- UTILS ---
const parseTime = (t, d) => { if (!t || !d) return new Date(); try { const [year, month, day] = d.split('-').map(Number); const [time, modifier] = t.split(' '); let [hours, minutes] = time.split(':').map(Number); if (hours === 12) hours = 0; if (modifier === 'PM') hours += 12; return new Date(year, month - 1, day, hours, minutes, 0, 0); } catch (e) { return new Date(); } };
const isPastTime = (t, d) => parseTime(t, d) < new Date();
const cleanPhone = p => p ? p.replace(/\D/g, '') : '';
const formatPhone = p => { if (!p) return 'N/A'; const c = ('' + p).replace(/\D/g, ''), m = c.match(/^(\d{3})(\d{3})(\d{4})$/); return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p; };
const cleanPhoneForSearch = v => v ? v.toString().replace(/\D/g, '') : '';
const normalizeText = t => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
const parseDuration = (durStr) => { if (!durStr) return 60; const num = parseInt(durStr); return isNaN(num) ? 60 : num; };
const generateTimeSlots = (startStr, endStr, intervalMinutes = 60) => {
    if (!startStr || !endStr) return DEFAULT_TIME_SLOTS;
    const slots = []; let [startH, startM] = startStr.split(':').map(Number); const [endH, endM] = endStr.split(':').map(Number);
    let current = new Date(); current.setHours(startH, startM, 0, 0); const end = new Date(); end.setHours(endH, endM, 0, 0);
    while (current < end) {
        const hours = current.getHours(); const minutes = current.getMinutes(); const ampm = hours >= 12 ? 'PM' : 'AM'; const displayH = hours % 12 || 12; const displayM = minutes < 10 ? '0' + minutes : minutes;
        slots.push(`${displayH < 10 ? '0' + displayH : displayH}:${displayM} ${ampm}`);
        current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    return slots;
};

// --- GLOBAL COMPONENTS ---
const UsersIcon = ({ size, className }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;

const NavItem = ({ i: Icon, l, id, activeId, onSelect }) => (
    <button onClick={() => onSelect(id)} className={`flex flex-col items-center ${activeId === id ? 'text-amber-500' : 'text-slate-500'}`}>
        <Icon size={24} strokeWidth={activeId === id ? 2.5 : 2} />
        <span className="text-[10px] font-bold">{l}</span>
    </button>
);

const UpdateToast = ({ registration }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!registration) return;
        if (registration.waiting) setVisible(true);
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) setVisible(true);
            });
        });
    }, [registration]);
    const updateApp = () => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            setVisible(false); window.location.reload();
        }
    };
    if (!visible) return null;
    return (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[300] bg-slate-800 border border-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 w-[90%] max-w-md animate-bounce-in">
            <div className="bg-amber-500/20 p-2 rounded-full"><RefreshCw className="text-amber-500 spin-anim" size={24} /></div>
            <div className="flex-1"><p className="font-bold text-sm">Nueva versión disponible</p><p className="text-xs text-slate-400">Toca para actualizar.</p></div>
            <button onClick={updateApp} className="bg-amber-500 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">ACTUALIZAR</button>
        </div>
    );
};

// --- NUEVO MODAL DE CONFIRMACIÓN ---
const ConfirmModal = ({ show, msg, onConfirm, onCancel }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
                <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="text-red-500" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¿Estás seguro?</h3>
                <p className="text-slate-400 text-sm mb-6">{msg}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300 font-bold active:scale-95 transition-transform">Cancelar</button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-red-500/20">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const AlertModal = ({ show, title = "Aviso", msg, onClose }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
                <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                    <Info className="text-amber-500" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm mb-6">{msg}</p>
                <button onClick={onClose} className="w-full py-3 bg-amber-500 text-slate-900 font-bold rounded-xl active:scale-95 transition-transform">Aceptar</button>
            </div>
        </div>
    );
};

const SuccessModal = ({ show, onClose, appointmentDetails, allAppointments, isKiosk }) => {
    useEffect(() => { if (show && isKiosk) { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); } }, [show, isKiosk, onClose]);
    const queueCount = useMemo(() => {
        if (!allAppointments || !appointmentDetails) return 0;
        const currentDateTime = parseTime(appointmentDetails.time, appointmentDetails.date);
        return allAppointments.filter(a => {
            if (a.status === 'cancelada' || a.status === 'completed' || a.date !== appointmentDetails.date) return false;
            return parseTime(a.time, a.date) < currentDateTime;
        }).length;
    }, [allAppointments, appointmentDetails]);

    if (!show || !appointmentDetails) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-sm w-full text-center relative overflow-hidden mx-auto">
                <div className="w-24 h-24 mx-auto mb-6"><svg className="checkmark w-24 h-24 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" /><path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" /></svg></div>
                <h2 className="text-3xl font-bold text-white mb-2">¡Listo!</h2>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-4 text-left"><p className="text-amber-500 text-xs font-bold uppercase mb-1">Resumen</p><p className="text-white font-bold text-lg">{appointmentDetails.serviceTitle}</p><div className="flex justify-between mt-2 text-sm text-slate-400"><span>{appointmentDetails.date}</span><span>{appointmentDetails.time}</span></div></div>
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 mb-6 flex items-start gap-3 text-left"><UsersIcon className="text-blue-400 shrink-0 mt-0.5" size={18} /><div><p className="text-blue-200 text-xs leading-relaxed">Hay <strong className="text-white">{queueCount} clientes</strong> antes de ti hoy.{isKiosk && <span className="block mt-1 font-bold text-amber-400">Esta pantalla se cerrará automáticamente...</span>}</p></div></div>
                <button onClick={onClose} className="w-full bg-amber-500 text-slate-900 font-bold py-4 rounded-xl active:scale-95 transition-transform">ENTENDIDO</button>
            </div>
            <style>{`.checkmark__circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #22c55e; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; } .checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 3; stroke: #fff; stroke-miterlimit: 10; box-shadow: inset 0px 0px 0px #22c55e; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; } .checkmark__check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; } @keyframes stroke { 100% { stroke-dashoffset: 0; } } @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } } @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 50px #22c55e; } }`}</style>
        </div>
    );
};

const ServiceModal = ({ show, onClose, onSave, initialData }) => {
    const [form, setForm] = useState({ title: '', price: '', duration: '30 min', description: '', iconName: 'scissors' });
    useEffect(() => { if (initialData) setForm(initialData); else setForm({ title: '', price: '', duration: '30 min', description: '', iconName: 'scissors' }); }, [initialData, show]);
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-white">{initialData ? 'Editar' : 'Nuevo'} Servicio</h3>
                <div className="space-y-3">
                    <div><label className="text-xs text-slate-400">Nombre</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej: Corte" /></div>
                    <div className="flex gap-3"><div className="flex-1"><label className="text-xs text-slate-400">Precio</label><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div><div className="flex-1"><label className="text-xs text-slate-400">Duración</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div></div>
                    <div><label className="text-xs text-slate-400">Descripción</label><textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalles..." /></div>
                    <div><label className="text-xs text-slate-400">Icono</label><div className="flex gap-2">{Object.keys(ICON_MAP).map(k => <button key={k} onClick={() => setForm({ ...form, iconName: k })} className={`p-3 rounded-lg border ${form.iconName === k ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{getIcon(k)}</button>)}</div></div>
                </div>
                <div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300">Cancelar</button><button onClick={() => onSave(form)} className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl">Guardar</button></div>
            </div>
        </div>
    );
};

const ChangePasswordView = ({ onSave, onCancel }) => {
    const [pass, setPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [alertData, setAlertData] = useState({ show: false, msg: '' });

    return (
        <div className="pb-24 px-4 pt-20 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-white">Cambiar Contraseña</h2>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 max-w-md mx-auto">
                <div className="mb-4">
                    <label className="text-slate-400 text-sm block mb-2">Nueva Contraseña</label>
                    <div className="relative">
                        <input type={showPass ? "text" : "password"} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-10 text-white" value={pass} onChange={e => setPass(e.target.value)} />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                            {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <div className="mb-6">
                    <label className="text-slate-400 text-sm block mb-2">Confirmar Contraseña</label>
                    <div className="relative">
                        <input type={showConfirm ? "text" : "password"} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-10 text-white" value={confirm} onChange={e => setConfirm(e.target.value)} />
                        <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300 font-bold">Cancelar</button>
                    <button onClick={() => { if (pass !== confirm) return setAlertData({ show: true, msg: 'Las contraseñas no coinciden' }); if (pass.length < 6) return setAlertData({ show: true, msg: 'Mínimo 6 caracteres' }); onSave(pass); }} className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl">Actualizar</button>
                </div>
            </div>
            <AlertModal show={alertData.show} msg={alertData.msg} onClose={() => setAlertData({ show: false, msg: '' })} />
        </div>
    );
};

const AdminProfileView = ({ settings, onSaveSettings, onChangePass, bizName, bizSubtitle, onSaveBrand }) => {
    const [start, setStart] = useState(settings.start || '09:00');
    const [end, setEnd] = useState(settings.end || '19:00');
    const [name, setName] = useState(bizName || '');
    const [sub, setSub] = useState(bizSubtitle || '');

    // Sync state if props change
    useEffect(() => { setName(bizName || ''); setSub(bizSubtitle || ''); }, [bizName, bizSubtitle]);

    return (
        <div className="pb-24 px-4 pt-20 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-white">Configuración</h2>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Edit2 size={18} /> Identidad del Negocio</h3>
                <div className="space-y-4 mb-6">
                    <div><label className="text-xs text-slate-400 block mb-2">Nombre Comercial</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block mb-2">Slogan / Subtítulo</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={sub} onChange={e => setSub(e.target.value)} /></div>
                </div>
                <button onClick={() => onSaveBrand({ name, subtitle: sub })} className="w-full bg-slate-700 text-amber-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-600 hover:bg-slate-600">ACTUALIZAR DATOS</button>
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} /> Horario de Atención</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><label className="text-xs text-slate-400 block mb-2">Apertura</label><input type="time" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={start} onChange={e => setStart(e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 block mb-2">Cierre</label><input type="time" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={end} onChange={e => setEnd(e.target.value)} /></div>
                </div>
                <button onClick={() => onSaveSettings({ start, end })} className="w-full bg-amber-500 text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> GUARDAR CAMBIOS</button>
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Lock size={18} /> Seguridad</h3>
                <button onClick={onChangePass} className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-600 hover:bg-slate-600">CAMBIAR CONTRASEÑA</button>
            </div>
        </div>
    );
};


const RevenueView = ({ appointments, downloadCSV, services }) => {
    const [filter, setFilter] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const filteredApps = useMemo(() => {
        const now = new Date(); let start = new Date(), end = new Date(); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
        if (filter === 'week') { const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1); start = new Date(now.setDate(diff)); start.setHours(0, 0, 0, 0); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999); }
        else if (filter === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); }
        else if (filter === 'custom') { if (!customStart || !customEnd) return []; start = new Date(customStart); end = new Date(customEnd); end.setHours(23, 59, 59, 999); }
        return appointments.filter(a => { if (a.status === 'cancelada') return false; const d = new Date(a.date + 'T00:00:00'); return d >= start && d <= end; });
    }, [filter, customStart, customEnd, appointments]);

    const totalRevenue = filteredApps.reduce((sum, a) => sum + (a.price || 0), 0);

    const serviceStats = useMemo(() => {
        const stats = {};
        filteredApps.forEach(a => {
            if (!stats[a.serviceTitle]) stats[a.serviceTitle] = { count: 0, amount: 0 };
            stats[a.serviceTitle].count += 1;
            stats[a.serviceTitle].amount += a.price;
        });
        return Object.entries(stats).sort((a, b) => b[1].amount - a[1].amount);
    }, [filteredApps]);

    // Calculate max value for bar chart scaling
    const maxAmount = useMemo(() => {
        if (serviceStats.length === 0) return 0;
        return Math.max(...serviceStats.map(([, stat]) => stat.amount));
    }, [serviceStats]);

    return (
        <div className="pb-24 pt-10 min-h-screen bg-slate-900 text-slate-100 font-sans animate-fade-in relative overflow-x-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 mb-6">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-[28px] font-extrabold tracking-tight text-white leading-tight">Reportes Financieros</h1>
                    <p className="text-[14px] text-slate-400 font-medium">Resumen de actividad</p>
                </div>
                <button onClick={() => downloadCSV(filteredApps)} className="flex items-center justify-center w-[42px] h-[42px] rounded-full bg-slate-800 border border-slate-700 text-amber-500 hover:text-white hover:bg-slate-700 transition-all duration-300 shadow-lg shadow-amber-500/10">
                    <FileSpreadsheet size={20} />
                </button>
            </div>

            {/* Filters */}
            <div className="px-6 mb-8">
                <div className="bg-slate-800 p-1.5 rounded-2xl flex items-center justify-between border border-slate-700 shadow-sm">
                    {['today', 'week', 'month', 'custom'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-3 text-xs font-medium rounded-xl transition-all duration-200 ${filter === f ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
                            {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : 'Rango'}
                        </button>
                    ))}
                </div>
                {filter === 'custom' && (
                    <div className="flex gap-3 mt-4 animate-fade-in">
                        <div className="flex-1 bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Desde</label>
                            <input type="date" className="w-full bg-transparent border-none p-0 text-white text-sm outline-none font-medium" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                        </div>
                        <div className="flex-1 bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Hasta</label>
                            <input type="date" className="w-full bg-transparent border-none p-0 text-white text-sm outline-none font-medium" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-8 px-6">

                {/* Total Revenue Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-xl p-6 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-slate-400 text-sm font-medium">Ingresos Totales</span>
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-500">
                            <DollarSign size={18} />
                        </span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-4xl font-extrabold text-white tracking-tight mb-2">RD$ {totalRevenue.toLocaleString()}</h2>
                        <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 w-fit px-3 py-1.5 rounded-lg border border-green-500/20">
                            <TrendingUp size={14} />
                            <span>+12% vs mes anterior</span> {/* Placeholder logic for now */}
                        </div>
                    </div>
                </div>

                {/* Comparative Chart */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <PieChart size={20} className="text-amber-500" />
                        <h3 className="text-lg font-bold text-white">Comparativa de Servicios</h3>
                    </div>

                    <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-sm relative overflow-hidden">
                        {serviceStats.length > 0 ? (
                            <>
                                <div className="flex items-end justify-between gap-3 h-[180px] w-full pt-4 pb-2">
                                    {serviceStats.slice(0, 4).map(([name, stat]) => {
                                        // Calculate percentage height relative to max, ensure at least 10%
                                        const hPercent = maxAmount > 0 ? Math.max(15, Math.round((stat.amount / maxAmount) * 85)) : 0;
                                        return (
                                            <div key={name} className="flex flex-col items-center gap-2 h-full justify-end w-1/4 group cursor-pointer relative">
                                                <div className="w-full bg-slate-700/50 rounded-t-lg overflow-hidden flex items-end h-full relative">
                                                    <div className="w-full bg-amber-500/80 group-hover:bg-amber-500 transition-colors rounded-t-lg bar-animate absolute bottom-0 left-0 right-0 mx-auto" style={{ '--h': `${hPercent}%`, width: '100%' }}></div>
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border border-slate-600 pointer-events-none font-bold shadow-xl">
                                                        RD$ {stat.amount.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* X-Axis Labels */}
                                <div className="flex justify-between w-full pt-3 gap-3 border-t border-slate-700/50 mt-2">
                                    {serviceStats.slice(0, 4).map(([name]) => (
                                        <div key={name} className="w-1/4 text-center">
                                            <span className="text-[10px] text-slate-400 font-medium block truncate max-w-full" title={name}>{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <PieChart size={48} className="mb-2" />
                                <p className="text-xs">Sin datos para mostrar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Service Breakdown List */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-amber-500" />
                        <h3 className="text-lg font-bold text-white">Desglose por Servicio</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {serviceStats.map(([name, stat]) => (
                            <div key={name} className="flex items-center justify-between p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-amber-500/30 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shadow-inner">
                                        {/* Try to find matching icon or default */}
                                        {getIcon(services.find(s => s.title === name)?.iconName || 'scissors')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white leading-tight">{name}</span>
                                        <span className="text-xs text-slate-500 mt-1 font-medium">{stat.count} citas realizadas</span>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg">RD$ {stat.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        {serviceStats.length === 0 && <p className="text-center text-slate-500 text-sm py-4 italic">No hay actividad en este periodo.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
};


const BlockScheduleView = ({ blockedSlots, onSaveBlock, onDeleteBlock, timeSlots }) => {
    const [bDate, setBDate] = useState(''); const [bTimes, setBTimes] = useState([]); const [bAllDay, setBAllDay] = useState(false);
    const myBlocks = useMemo(() => blockedSlots.sort((a, b) => new Date(a.date) - new Date(b.date)), [blockedSlots]);
    const toggleTime = (t) => { if (bTimes.includes(t)) setBTimes(bTimes.filter(x => x !== t)); else setBTimes([...bTimes, t]); };
    const handleSubmit = () => { onSaveBlock(bDate, bAllDay, bTimes, () => { setBDate(''); setBTimes([]); setBAllDay(false); }); };
    return (
        <div className="pb-24 px-4 pt-20 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-white">Bloquear Horario</h2>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-8">
                <label className="text-xs text-slate-400 block mb-2">Fecha a bloquear</label>
                <div className="relative mb-4"><input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white cursor-pointer" value={bDate} onChange={e => setBDate(e.target.value)} /><Calendar className="absolute right-4 top-3 text-amber-500 pointer-events-none" size={20} /></div>
                <div className="flex items-center gap-3 mb-4 bg-slate-900/50 p-3 rounded-lg cursor-pointer" onClick={() => setBAllDay(!bAllDay)}><div className={`w-5 h-5 rounded border flex items-center justify-center ${bAllDay ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`}>{bAllDay && <CheckCircle size={14} className="text-slate-900" />}</div><span className="text-sm text-white font-bold">Cerrar día completo</span></div>
                {!bAllDay && <div className="grid grid-cols-3 gap-2 mb-6">{timeSlots.map(t => <button key={t} onClick={() => toggleTime(t)} className={`py-2 text-[10px] font-bold rounded-lg border ${bTimes.includes(t) ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>{t}</button>)}</div>}
                <button onClick={handleSubmit} className="w-full bg-amber-500 text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Lock size={18} /> BLOQUEAR</button>
            </div>
            <h3 className="font-bold mb-4 text-white text-sm">Bloqueos Activos</h3>
            <div className="space-y-3">{myBlocks.map(b => <div key={b.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center"><div><div className="flex items-center gap-2 text-amber-500 font-bold"><CalendarOff size={16} /> {b.date}</div><p className="text-xs text-slate-400 mt-1">{b.wholeDay ? 'Día Cerrado' : `${b.times.length} horas bloqueadas`}</p></div><button onClick={() => onDeleteBlock(b.id)} className="p-2 bg-slate-700 rounded-lg text-red-400 hover:bg-slate-600"><Trash2 size={18} /></button></div>)} {myBlocks.length === 0 && <p className="text-slate-500 text-center text-xs italic">No hay bloqueos.</p>}</div>
        </div>
    );
};

const AuthScreen = ({ onLogin, deferredPrompt, handleInstallClick, bizName, subtitle }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
    const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [isLookup, setLookup] = useState(false);
    const getTabLabel = (m) => m === 'login' ? 'Acceder' : m === 'register' ? 'Registrarse' : 'Cita Express';

    const handleReset = async () => {
        if (!email.includes('@')) { setError('Ingresa tu correo'); return; }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setError('Envio exitoso. Revisa tu correo.'); // Using error state for info message to save UI space
        } catch (e) {
            setError(e.message || 'Error al enviar');
        }
        setLoading(false);
    };

    const handleAuth = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);

        // --- GUEST LOOKUP (By Phone) ---
        if (mode === 'guest' && isLookup) {
            const cp = cleanPhoneForSearch(phone);
            if (cp.length < 10) { setError('Teléfono inválido'); setLoading(false); return; }
            try {
                const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), where('userPhone', '==', cp));
                const sn = await getDocs(q);
                if (!sn.empty) onLogin({ displayName: sn.docs[0].data().userName || 'Invitado', phone: cp, email: '', isAdmin: false, isGuest: true });
                else setError('No se encontraron citas.');
            } catch { setError('Error de conexión.'); }
            setLoading(false); return;
        }

        // --- AUTHENTICATION (Login / Register / Guest Create) ---
        try {
            if (mode === 'guest' && !isLookup) {
                const cp = cleanPhoneForSearch(phone);
                if (!name.trim()) throw new Error('Nombre obligatorio');
                if (cp.length < 10) throw new Error('Teléfono 10 dígitos');
                // Guests don't use Firebase Auth credentials in this flow, they just pass through locally
                onLogin({ displayName: name, email: '', phone: cp, isAdmin: false, isGuest: true });
            }
            else if (mode === 'register') {
                if (!name.trim()) throw new Error('Nombre obligatorio');
                if (!email.includes('@')) throw new Error('Correo inválido');
                if (password.length < 6) throw new Error('Pass min 6');

                // Create user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // Add displayName to local object passed to app (Firebase updateProfile is async, can be done later if needed)
                onLogin({ ...user, displayName: name, isAdmin: false });
            }
            else if (mode === 'login') {
                if (!email.includes('@')) throw new Error('Correo inválido');
                if (password.length < 1) throw new Error('Ingresa pass');

                // Sign in with Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                onLogin({ ...user, isAdmin: false }); // isAdmin check happens in App component based on email
            }
        } catch (err) {
            console.error(err);
            if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password') || err.message.includes('auth/user-not-found')) {
                setError('Credenciales incorrectas');
            } else if (err.message.includes('auth/email-already-in-use')) {
                setError('El correo ya está registrado');
            } else {
                setError(err.message || 'Error al conectar');
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center p-6 text-slate-100">
            <div className="mb-6 text-center"><div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-white/20"><Scissors className="w-10 h-10 text-black" /></div><h1 className="text-4xl font-bold text-amber-500">{bizName ? bizName.toUpperCase() : 'BARBEROS'}</h1><p className="text-slate-400 text-sm">{subtitle || 'Tu aplicación de reservas'}</p></div>
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
                <div className="flex border-b border-slate-700 mb-6">{['login', 'guest', 'register'].map(m => <button key={m} onClick={() => { setMode(m); setLookup(false); setError(''); }} className={`flex-1 py-2 text-xs font-bold uppercase ${mode === m ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}><span className={m === 'guest' ? 'text-neon' : ''}>{getTabLabel(m)}</span></button>)}</div>
                <form onSubmit={handleAuth} className="space-y-4">
                    {(mode === 'register' || (mode === 'guest' && !isLookup)) && <div className="relative"><User size={18} className="absolute left-3 top-3 text-slate-500" /><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pl-10 outline-none text-white focus:border-amber-500" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} /></div>}
                    {mode === 'guest' && <div className="relative"><Smartphone size={18} className="absolute left-3 top-3 text-slate-500" /><input type="tel" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pl-10 outline-none text-white focus:border-amber-500" placeholder="Teléfono (10 dígitos)" value={phone} onChange={e => setPhone(e.target.value)} /></div>}
                    {mode !== 'guest' && <><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-amber-500" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} /><input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-amber-500" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} /></>}
                    {error && <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded animate-pulse">{error}</div>}
                    <button disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-2 rounded-lg">{loading ? '...' : 'CONTINUAR'}</button>
                </form>
                {mode === 'guest' && <div className="mt-4 text-center"><button onClick={() => { setLookup(!isLookup); setError(''); }} className="text-xs text-amber-500 underline">{isLookup ? 'Quiero agendar nueva' : '¿Ya tienes cita? Buscar'}</button></div>}
                {mode === 'login' && <div className="mt-4 text-center flex justify-between px-2"><p onClick={handleReset} className="text-xs text-slate-400 hover:text-white cursor-pointer underline">¿Olvidaste tu clave?</p></div>}
                {mode === 'login' && <div className="mt-6 pt-4 border-t border-slate-700 text-center"><p className="text-xs text-slate-500">OVM Consulting. Todos los derechos reservados 2025</p></div>}
            </div>
            {deferredPrompt && <button onClick={handleInstallClick} className="mt-8 mx-auto flex items-center gap-2 bg-slate-800 text-amber-500 px-6 py-3 rounded-full border border-amber-500/30 shadow-lg"><Download size={20} /> <span className="font-bold text-sm">INSTALAR APP</span></button>}
        </div>
    );
};

const KioskView = ({ appointments, onExit, onExpress, bizName }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const todayStr = new Date().toISOString().split('T')[0];
    useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
    const todayList = useMemo(() => appointments.filter(a => a.date === todayStr && a.status !== 'cancelada' && a.status !== 'completed').sort((a, b) => parseTime(a.time, a.date) - parseTime(b.time, b.date)), [appointments, todayStr]);
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col p-6 relative overflow-hidden">
            <button onClick={onExit} className="absolute top-4 left-4 text-slate-700 hover:text-slate-500"><ArrowLeft size={24} /></button>
            <div className="text-center mb-8 pt-4"><div className="flex items-center justify-center gap-3 mb-2"><Scissors className="text-amber-500" size={32} /><h1 className="text-3xl font-bold text-white tracking-widest">{bizName ? bizName.toUpperCase() : 'BARBEROS'}</h1></div><p className="text-slate-400 text-sm uppercase tracking-widest">Agenda del Día</p><div className="mt-6 text-5xl md:text-6xl font-black text-white font-mono tracking-tighter">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div><p className="text-amber-500 font-bold mt-2">{currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
            <div className="flex-1 overflow-y-auto mb-6 pr-2">{todayList.length === 0 ? <div className="text-center py-10 opacity-40"><Calendar size={48} className="mx-auto mb-4" /><p>Agenda disponible.</p></div> : <div className="space-y-3">{todayList.map((app, idx) => { const isCompleted = app.status === 'completed'; return (<div key={app.id} className={`p-4 rounded-2xl flex items-center justify-between border ${isCompleted ? 'bg-slate-800/50 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 shadow-lg'}`}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isCompleted ? 'bg-slate-700 text-slate-400' : 'bg-amber-500 text-slate-900'}`}>{idx + 1}</div><div><h3 className={`font-bold ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{app.userName.split(' ')[0]}</h3><p className="text-xs text-slate-400">{app.serviceTitle}</p></div></div><div className="text-right"><span className={`text-lg font-bold ${isCompleted ? 'text-slate-500' : 'text-amber-500'}`}>{app.time}</span></div></div>); })}</div>}</div>
            <button onClick={onExpress} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-6 rounded-3xl shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 transition-transform"><div className="bg-white/20 p-2 rounded-full"><Plus size={24} className="text-white" /></div><div className="text-left"><p className="text-xs font-bold text-white/80 uppercase tracking-wider">¿Sin Cita?</p><h2 className="text-2xl font-bold leading-none">CITA EXPRESS</h2></div></button>
        </div>
    );
};

const KioskAuth = ({ setView, handleKioskGuestLogin }) => {
    const [name, setName] = useState(''); const [phone, setPhone] = useState('');
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center p-6 animate-fade-in relative">
            <button onClick={() => setView('kiosk')} className="absolute top-4 left-4 text-slate-500"><X size={32} /></button>
            <h2 className="text-3xl font-bold text-white text-center mb-8">Datos para la Cita</h2>
            <div className="space-y-6">
                <div><label className="text-slate-400 text-sm block mb-2">Tu Nombre</label><input className="w-full bg-slate-800 p-4 rounded-xl text-xl text-white border border-slate-700" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan" /></div>
                <div><label className="text-slate-400 text-sm block mb-2">Tu Teléfono</label><input type="tel" className="w-full bg-slate-800 p-4 rounded-xl text-xl text-white border border-slate-700" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 809..." /></div>
                <button onClick={() => handleKioskGuestLogin({ displayName: name, phone, email: '', isGuest: true })} disabled={!name || phone.length < 10} className="w-full bg-amber-500 py-5 rounded-xl text-slate-900 font-bold text-xl disabled:opacity-50">CONTINUAR</button>
            </div>
        </div>
    );
};

const EditBusinessModal = ({ show, onClose, onSave, initialData }) => {
    const [form, setForm] = useState({ name: '', subtitle: '', adminEmail: '', status: 'active', password: '' });
    useEffect(() => { if (initialData) setForm({ ...initialData, password: '' }); }, [initialData]);
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-6 text-white text-center">{initialData?.id ? 'Editar Negocio' : 'Nuevo Negocio'}</h3>
                <div className="space-y-4">
                    {/* ID only for new */}
                    {!initialData?.id && <div><label className="text-xs text-slate-400 font-bold uppercase mb-1 block">ID (URL)</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.id || ''} onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="ej: mi-barberia" /></div>}

                    <div><label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Nombre Comercial</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>

                    <div><label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Subtítulo / Slogan</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Ej: Estilo y Clase" /></div>

                    <div><label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Email Admin</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} /></div>

                    <div><label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Contraseña {initialData?.id ? '(Opcional/Reset)' : 'Inicial'}</label><input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={initialData?.id ? "Dejar vacío para no cambiar" : "Contraseña de acceso"} /></div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300 font-bold">Cancelar</button>
                    <button onClick={() => onSave(form)} className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl">Guardar</button>
                </div>
            </div>
        </div>
    );
};

const SuperAdminDashboard = ({ onLogout }) => {
    const [businesses, setBusinesses] = useState([]);
    const [stats, setStats] = useState({ active: 0, total: 0 });
    const [showModal, setShowModal] = useState(false);
    const [editingBiz, setEditingBiz] = useState(null); // For edit modal
    const [deleteId, setDeleteId] = useState(null); // For delete modal
    const [alertData, setAlertData] = useState({ show: false, title: '', msg: '' });
    const [view, setView] = useState('home');

    // Profile Feature States
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ displayName: '', phone: '' });

    useEffect(() => {
        if (view === 'profile' && auth.currentUser) {
            setProfileForm({
                displayName: auth.currentUser.displayName || 'Super Admin',
                phone: auth.currentUser.phoneNumber || ''
            });
        }
    }, [view]);

    const handleUpdateProfile = async () => {
        try {
            await updateProfile(auth.currentUser, { displayName: profileForm.displayName });
            // Phone update is complex in Firebase Auth (requires verification), so we'll just update display name for now or store phone in a doc if we had one.
            // For this demo/MVP, we'll just update the Auth displayName.
            setAlertData({ show: true, title: 'Éxito', msg: 'Perfil actualizado' });
            setShowEditProfile(false);
        } catch (e) {
            console.error(e);
            setAlertData({ show: true, title: 'Error', msg: 'No se pudo actualizar el perfil' });
        }
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            setAlertData({ show: true, title: 'Error', msg: 'Este navegador no soporta notificaciones.' });
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            new Notification("Barberos", { body: "Notificaciones activadas correctamente." });
            setAlertData({ show: true, title: 'Éxito', msg: 'Notificaciones activadas y probadas.' });
        } else {
            setAlertData({ show: true, title: 'Aviso', msg: 'Permiso denegado.' });
        }
    };

    const [showChangePass, setShowChangePass] = useState(false);

    useEffect(() => {
        document.title = "Barberos - Panel Super Admin"; // Set title
        const q = query(collection(db, 'businesses'));
        const unsub = onSnapshot(q, (sn) => {
            const list = sn.docs.map(d => ({ id: d.id, ...d.data() }));
            setBusinesses(list);
            setStats({ active: list.filter(b => b.status === 'active').length, total: list.length });
        });
        return unsub;
    }, []);

    const handleSaveBusiness = async (formData) => {
        if (!formData.name) return alert('Nombre requerido');
        try {
            const dataToSave = {
                name: formData.name,
                subtitle: formData.subtitle || '',
                adminEmail: formData.adminEmail,
                status: formData.status || 'active'
            };
            // Note: Password handling should ideally be done via Firebase Auth Admin SDK on backend
            // For now, we just save it to DB if testing (SECURITY WARNING), or assume user handles reset
            if (formData.password) dataToSave.initialPasswordDisplay = formData.password; // INSECURE: Demo only or delete after view

            if (formData.id && editingBiz) {
                // Edit existing
                await updateDoc(doc(db, 'businesses', editingBiz.id), dataToSave);
                setAlertData({ show: true, title: 'Éxito', msg: 'Negocio actualizado correctamente.' });
            } else {
                // Create New
                if (!formData.id) return setAlertData({ show: true, title: 'Error', msg: 'ID requerido' });
                if (!formData.adminEmail || !formData.password) return setAlertData({ show: true, title: 'Error', msg: 'Email y Contraseña son requeridos para crear la cuenta' });

                const newId = formData.id;

                // 1. Create Auth User (Secondary App Pattern)
                const secondaryApp = initializeApp(firebaseConfig, "Secondary");
                const secondaryAuth = getAuth(secondaryApp);
                try {
                    await createUserWithEmailAndPassword(secondaryAuth, formData.adminEmail, formData.password);
                    await deleteApp(secondaryApp); // Cleanup
                } catch (authErr) {
                    await deleteApp(secondaryApp); // Cleanup even on error
                    if (authErr.code === 'auth/email-already-in-use') {
                        // If user exists, we proceed (linking logic), but warn
                        console.log('User already exists, linking business...');
                    } else {
                        throw authErr; // Stop creation if other auth error
                    }
                }

                // 2. Create Create Business Doc
                await setDoc(doc(db, 'businesses', newId), { ...dataToSave, createdAt: new Date().toISOString(), subscriptionStatus: 'paid' });
                const batch = writeBatch(db);
                DEFAULT_SERVICES.forEach(sv => batch.set(doc(collection(db, 'artifacts', newId, 'public', 'data', 'services')), sv));
                batch.set(doc(db, 'artifacts', newId, 'public', 'data', 'settings', 'config'), { start: '09:00', end: '19:00' });
                await batch.commit();
                setAlertData({ show: true, title: 'Éxito', msg: 'Negocio y Cuenta creados. Link: ?id=' + newId });
            }
            setShowModal(false); setEditingBiz(null);
        } catch (e) {
            console.error(e);
            setAlertData({ show: true, title: 'Error', msg: e.message || 'Error al guardar.' });
        }
    };

    const handleDeleteBusiness = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'businesses', deleteId));
            setAlertData({ show: true, title: 'Eliminado', msg: 'El negocio ha sido eliminado.' });
        } catch (e) { console.error(e); setAlertData({ show: true, title: 'Error', msg: 'No se pudo eliminar.' }); }
        setDeleteId(null);
    };

    const toggleStatus = async (id, currentStatus) => {
        await updateDoc(doc(db, 'businesses', id), { status: currentStatus === 'active' ? 'suspended' : 'active' });
    };

    // Simulated Revenue Calculation
    const totalRevenue = useMemo(() => stats.active * 5000, [stats.active]);

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-slate-800/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Barberos</h1>
                    <p className="text-slate-400 text-xs">Panel de Super Admin</p>
                </div>
                <button onClick={onLogout} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                    <LogOut size={20} />
                </button>
            </div>

            {view === 'home' && (
                <div className="p-4 animate-fade-in">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-1">Negocios Activos</h3>
                            <p className="text-3xl font-bold text-white mb-2">{stats.active}</p>
                            <Home size={32} className="absolute top-4 right-4 text-slate-700" />
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-1">Total Registrados</h3>
                            <p className="text-3xl font-bold text-white mb-2">{stats.total}</p>
                            <User size={32} className="absolute top-4 right-4 text-slate-700" />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Negocios</h2>
                        <button onClick={() => { setEditingBiz(null); setShowModal(true); }} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
                            <Plus size={18} />
                            <span className="hidden sm:inline">Nuevo</span>
                        </button>
                    </div>

                    {/* Responsive List: Cards for Mobile, Table for Desktop */}
                    <div className="space-y-4 md:hidden">
                        {businesses.map(biz => (
                            <div key={biz.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg leading-tight">{biz.name}</h3>
                                        <p className="text-amber-500 text-xs font-mono mt-1">{biz.id}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${biz.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                        {biz.status?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    <p>{biz.adminEmail}</p>
                                    <p className="mt-1 opacity-75">Registro: {biz.createdAt && typeof biz.createdAt === 'string' ? new Date(biz.createdAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700">
                                    <button onClick={() => { setEditingBiz(biz); setShowModal(true); }} className="flex-1 py-3 bg-slate-700 rounded-lg text-blue-300 text-sm font-bold hover:bg-slate-600 uppercase tracking-wider">EDITAR</button>
                                    <button onClick={() => handleDeleteBusiness(biz.id)} className="flex-1 py-3 bg-slate-700 rounded-lg text-red-400 text-sm font-bold hover:bg-slate-600 transition-colors uppercase tracking-wider">ELIMINAR</button>
                                    <button onClick={() => toggleStatus(biz.id, biz.status)} className="flex-1 py-3 bg-slate-700 rounded-lg text-slate-300 text-sm font-bold hover:bg-slate-600 transition-colors uppercase tracking-wider">
                                        {biz.status === 'active' ? 'Suspender' : 'Activar'}
                                    </button>
                                    <a href={`?id=${biz.id}`} target="_blank" className="p-3 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 transition-colors flex items-center justify-center">
                                        <Monitor size={18} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Admin Email</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {businesses.map(biz => (
                                    <tr key={biz.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-mono text-amber-500 text-xs">{biz.id}</td>
                                        <td className="p-4 font-bold text-white">{biz.name}</td>
                                        <td className="p-4 text-slate-400 text-sm">{biz.adminEmail}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${biz.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {biz.status?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => { setEditingBiz(biz); setShowModal(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-blue-400 hover:text-white transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteBusiness(biz.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                            <button onClick={() => toggleStatus(biz.id, biz.status)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <RefreshCw size={16} />
                                            </button>
                                            <a href={`?id=${biz.id}`} target="_blank" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <Monitor size={16} />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {
                view === 'stats' && (
                    <div className="p-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-6">Estadísticas</h2>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-4">
                            <p className="text-slate-400 text-xs uppercase font-bold mb-2">Ingresos Estimados (Mensual)</p>
                            <p className="text-4xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 mt-2">Calculado: {stats.active} negocios x $5,000</p>
                        </div>

                        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center flex flex-col items-center justify-center min-h-[200px]">
                            <TrendingUp size={48} className="text-slate-700 mb-4" />
                            <p className="text-slate-500 font-medium">Gráficos detallados próximamente...</p>
                        </div>
                    </div>
                )
            }

            {
                view === 'profile' && (
                    <div className="p-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-6">Mi Perfil</h2>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-2 border-slate-600">SA</div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">{auth.currentUser?.displayName || 'Super Admin'}</h3>
                                    <p className="text-slate-400 text-sm">{auth.currentUser?.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold uppercase">Master Access</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => setShowEditProfile(true)} className="w-full bg-slate-700/50 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-4 transition-all border border-slate-700 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors"><Edit2 size={18} /></div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-sm">Editar Información</p>
                                        <p className="text-xs text-slate-500">Nombre, Teléfono</p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-600" />
                                </button>

                                <button onClick={() => setShowChangePass(true)} className="w-full bg-slate-700/50 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-4 transition-all border border-slate-700 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors"><Lock size={18} /></div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-sm">Seguridad</p>
                                        <p className="text-xs text-slate-500">Cambiar Contraseña</p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-600" />
                                </button>

                                <button onClick={requestNotificationPermission} className="w-full bg-slate-700/50 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-4 transition-all border border-slate-700 group">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors"><Bell size={18} /></div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-sm">Notificaciones</p>
                                        <p className="text-xs text-slate-500">Probar Alertas</p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-6 py-2 flex justify-around items-center z-50 pb-safe">
                <button onClick={() => setView('home')} className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition-all w-16 group ${view === 'home' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}>
                    <div className={`p-1 rounded-xl transition-all ${view === 'home' ? 'bg-amber-500/20' : 'group-hover:bg-slate-800'}`}>
                        <Home size={24} strokeWidth={view === 'home' ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold">Inicio</span>
                </button>
                <button onClick={() => setView('stats')} className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition-all w-16 group ${view === 'stats' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}>
                    <div className={`p-1 rounded-xl transition-all ${view === 'stats' ? 'bg-amber-500/20' : 'group-hover:bg-slate-800'}`}>
                        <TrendingUp size={24} strokeWidth={view === 'stats' ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold">Stats</span>
                </button>
                <button onClick={() => setView('profile')} className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition-all w-16 group ${view === 'profile' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}>
                    <div className={`p-1 rounded-xl transition-all ${view === 'profile' ? 'bg-amber-500/20' : 'group-hover:bg-slate-800'}`}>
                        <Settings size={24} strokeWidth={view === 'profile' ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold">Perfil</span>
                </button>
            </div>

            {/* New/Edit Business Modal */}
            <EditBusinessModal show={showModal} onClose={() => setShowModal(false)} onSave={handleSaveBusiness} initialData={editingBiz} />
            <ConfirmModal show={!!deleteId} msg="¿Eliminar PERMANENTEMENTE este negocio?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
            <AlertModal show={alertData.show} title={alertData.title} msg={alertData.msg} onClose={() => setAlertData({ ...alertData, show: false })} />
            {/* New/Edit Business Modal */}
            <EditBusinessModal show={showModal} onClose={() => setShowModal(false)} onSave={handleSaveBusiness} initialData={editingBiz} />
            <ConfirmModal show={!!deleteId} msg="¿Eliminar PERMANENTEMENTE este negocio?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
            <AlertModal show={alertData.show} title={alertData.title} msg={alertData.msg} onClose={() => setAlertData({ ...alertData, show: false })} />

            {/* Edit Profile Modal (Inline for now) */}
            {showEditProfile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-white">Editar Perfil</h3>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 block mb-2">Nombre</label>
                            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" value={profileForm.displayName} onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300">Cancelar</button>
                            <button onClick={handleUpdateProfile} className="flex-1 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showChangePass && (
                <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-sm overflow-y-auto">
                    <button onClick={() => setShowChangePass(false)} className="absolute top-4 right-4 text-slate-400"><X size={32} /></button>
                    <ChangePasswordView
                        onCancel={() => setShowChangePass(false)}
                        onSave={async (newPass) => {
                            try {
                                await updatePassword(auth.currentUser, newPass);
                                setAlertData({ show: true, title: 'Éxito', msg: 'Contraseña actualizada' });
                                setShowChangePass(false);
                            } catch (e) {
                                setAlertData({ show: true, title: 'Error', msg: 'Debes volver a iniciar sesión para cambiar la clave.' });
                            }
                        }}
                    />
                </div>
            )}

        </div >
    );
};

// Landing View for users visiting root URL without ID
const LandingView = ({ onSuperAdminLogin }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [email, setEmail] = useState(''); const [pass, setPass] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simple hardcoded check for demo purposes, in real app authenticate against super_users collection
        if (email === 'admin@saas.com' && pass === 'admin123') {
            onSuperAdminLogin();
        } else {
            alert('Credenciales inválidas');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')] bg-cover opacity-20 filter blur-sm"></div>
            <div className="relative z-10 max-w-2xl">
                <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/20 rotate-3 transform hover:rotate-6 transition-transform"><Scissors size={40} className="text-slate-900" /></div>
                <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">BARBER<span className="text-amber-500">OS</span></h1>
                <p className="text-xl md:text-2xl text-slate-300 mb-10 font-light">La plataforma definitiva para gestionar tu barbería o estética.</p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button onClick={() => setShowLogin(true)} className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors">Iniciar Sesión</button>
                    <a href="mailto:ventas@barberos.com" className="bg-amber-500/10 text-amber-500 border border-amber-500/50 px-8 py-4 rounded-full font-bold text-lg hover:bg-amber-500 hover:text-slate-900 transition-all">Contáctanos</a>
                </div>
            </div>

            {showLogin && (
                <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-500"><X /></button>
                        <h2 className="text-2xl font-bold mb-6">Acceso Super Admin</h2>
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-4" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                        <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-6" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
                        <button onClick={handleLogin} className="w-full bg-amber-500 text-slate-900 font-bold py-4 rounded-xl">ENTRAR</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP ---
const PaymentPendingView = ({ name }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-fade-in relative z-50">
        <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/30">
            <AlertTriangle size={64} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{name}</h1>
        <h2 className="text-xl font-bold text-red-400 mb-6">Servicio Suspendido</h2>
        <p className="text-slate-400 max-w-md mb-8">
            La cuenta se encuentra temporalmente inactiva debido a un pago pendiente o suspensión administrativa.
        </p>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-sm w-full">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Contacto Soporte</p>
            <p className="text-white font-mono">soporte@barberos.com</p>
        </div>
    </div>
);

const App = () => {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('home');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [bizStatus, setBizStatus] = useState('active'); // active, suspended
    const [bizName, setBizName] = useState('');
    const [bizSubtitle, setBizSubtitle] = useState('');
    const [bizAdminEmail, setBizAdminEmail] = useState('');


    const [services, setServices] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [blockedSlots, setBlockedSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const [selService, setSelService] = useState(null);
    const [selDate, setSelDate] = useState('');
    const [selTime, setSelTime] = useState('');
    const [bookingDuration, setBookingDuration] = useState(null);
    const [editId, setEditId] = useState(null);
    const [origBooking, setOrigBooking] = useState(null);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    const [adminSettings, setAdminSettings] = useState({ start: '09:00', end: '19:00' });

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [swRegistration, setSwRegistration] = useState(null);
    const [toast, setToast] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastBookedApp, setLastBookedApp] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [kioskTempUser, setKioskTempUser] = useState(null);

    // NEW STATE FOR CONFIRM MODAL
    const [confirmData, setConfirmData] = useState({ show: false, msg: '', action: null });

    const currentTimeSlots = useMemo(() => {
        const interval = (user?.isAdmin && bookingDuration) ? parseDuration(bookingDuration) : (selService ? parseDuration(selService.duration) : 60);
        return generateTimeSlots(adminSettings.start, adminSettings.end, interval);
    }, [adminSettings, selService, bookingDuration, user]);

    // Handlers
    function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
    function handleManualRefresh() { setIsSpinning(true); setRefreshKey(k => k + 1); showToast('Actualizando...'); setTimeout(() => setIsSpinning(false), 1000); };
    async function handleInstall() { if (deferredPrompt) { deferredPrompt.prompt(); if ((await deferredPrompt.userChoice).outcome === 'accepted') setDeferredPrompt(null); } };
    async function handleSaveService(data) { try { if (editingService) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', editingService.id), data); else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'services'), data); setShowServiceModal(false); setEditingService(null); } catch (e) { console.error(e); } };

    // UPDATED HANDLERS USING CUSTOM MODAL
    function triggerConfirm(msg, action) { setConfirmData({ show: true, msg, action }); }

    async function handleDeleteService(id) {
        triggerConfirm("¿Borrar este servicio?", async () => {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', id));
            showToast('Servicio eliminado');
        });
    };

    async function handleLookupClient() {
        if (!manualPhone || manualPhone.length < 10) return showToast('Ingrese teléfono válido', 'error');
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), where('userPhone', '==', cleanPhone(manualPhone)));
            const sn = await getDocs(q);
            if (!sn.empty) {
                const clientData = sn.docs[0].data();
                if (clientData.userName) {
                    setManualName(clientData.userName);
                    showToast('Cliente encontrado');
                }
            } else {
                showToast('Cliente no encontrado', 'error');
            }
        } catch (e) { console.error(e); }
    };

    async function handleSaveSettings(newSettings) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newSettings);
            setAdminSettings(newSettings);
            showToast('Horario actualizado');
            setView('admin');
        } catch (e) { console.error(e); showToast('Error al guardar', 'error'); }
    };

    async function handleSaveBrand(data) {
        try {
            await updateDoc(doc(db, 'businesses', appId), data);
            showToast('Información actualizada');
        } catch (e) { console.error(e); showToast('Error al guardar', 'error'); }
    };

    async function handleBook(tempUserOverride = null, dateOverride = null) {
        const dateToUse = dateOverride || selDate;
        if (!dateToUse || !selTime || !selService) return;
        try {
            let u;
            if (tempUserOverride) u = tempUserOverride;
            else if (user?.isAdmin && !editId && manualName) u = { uid: 'admin_manual_' + Date.now(), name: manualName, email: '', phone: manualPhone, isGuest: true };
            else if (user?.isAdmin && origBooking) u = { uid: origBooking.userId, name: origBooking.userName, email: origBooking.userEmail, phone: origBooking.userPhone, isGuest: origBooking.isGuestBooking };
            else u = { uid: user.uid, name: user.displayName || 'Cliente', email: user.email || '', phone: user.phone || '', isGuest: !!user.isGuest };

            const finalName = u.name || u.displayName || 'Cliente';
            const finalDuration = bookingDuration || selService.duration;

            const data = {
                serviceId: selService.id,
                serviceTitle: selService.title,
                price: selService.price,
                date: dateToUse,
                time: selTime,
                duration: finalDuration,
                updatedAt: new Date().toISOString(),
                status: 'confirmada',
                userId: u.uid,
                userName: finalName,
                userEmail: u.email || '',
                userPhone: cleanPhone(u.phone || ''),
                isGuestBooking: !!u.isGuest
            };
            if (editId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', editId), data); showToast('Cita actualizada'); setView(user?.isAdmin ? 'admin' : 'appointments'); }
            else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), { ...data, createdAt: new Date().toISOString() }); setLastBookedApp(data); setShowSuccessModal(true); }
            setEditId(null); setOrigBooking(null); setSelService(null); setSelDate(''); setSelTime(''); setManualName(''); setManualPhone(''); setBookingDuration(null);
        } catch (e) { console.error(e); showToast("Error", 'error'); }
    };

    async function handleCancel(e, id) {
        e.stopPropagation();
        triggerConfirm("¿Cancelar esta cita?", async () => {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', id));
            showToast('Cita eliminada');
        });
    };

    async function handleComplete(e, id) {
        e.stopPropagation();
        triggerConfirm("¿Marcar como atendido?", async () => {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', id), { status: 'completed' });
            showToast('Servicio completado');
        });
    };

    function handleStartReschedule(app) { setEditId(app.id); setOrigBooking(app); setSelService(services.find(s => s.id === app.serviceId) || services[0]); setSelDate(app.date); setSelTime(app.time); setView('book'); };
    function handleLogout() { localStorage.removeItem('yoel_session'); setUser(null); setView('home'); setSelService(null); };

    async function handleSaveBlock(d, ad, t, cb) { if (!d) return showToast('Falta fecha', 'error'); if (!ad && t.length === 0) return showToast('Falta hora', 'error'); try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'blocked_slots'), { date: d, times: ad ? [] : t, wholeDay: ad, createdAt: new Date().toISOString() }); showToast('Guardado'); cb(); } catch { showToast('Error', 'error'); } };

    async function handleDeleteBlock(id) {
        triggerConfirm("¿Eliminar bloqueo?", async () => {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocked_slots', id));
            showToast('Bloqueo eliminado');
        });
    };

    function enterKioskMode() { setView('kiosk'); }
    function startKioskBooking() { setView('kiosk_auth'); }
    function handleKioskGuestLogin(g) { setKioskTempUser({ ...g, uid: 'kiosk_' + Date.now() }); setView('kiosk_book'); }

    // Effects
    // Effects
    // Init Auth / PWA
    useEffect(() => { const init = async () => { if (!auth.currentUser) await signInAnonymously(auth); }; init(); window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); setDeferredPrompt(e); }); return onAuthStateChanged(auth, firebaseUser => { if (firebaseUser) { const saved = localStorage.getItem('yoel_session'); if (saved) setUser({ ...firebaseUser, ...JSON.parse(saved) }); else setUser(firebaseUser); } else setUser(null); setLoading(false); }); }, []);

    // User Session Persistence
    useEffect(() => { if (user && user.displayName && !user.isAnonymous && (user.isAdmin !== undefined || user.isGuest !== undefined)) { const customData = { displayName: user.displayName, email: user.email, phone: user.phone, isAdmin: user.isAdmin, isGuest: user.isGuest }; localStorage.setItem('yoel_session', JSON.stringify(customData)); } }, [user]);

    // Service Worker
    useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => setSwRegistration(registration)); }, []);

    // Main Data Subscription (Only if appId is present)
    useEffect(() => {
        if (!appId) return; // Do not fetch if no appId logic

        // 1. Check Business Status
        const unsubBiz = onSnapshot(doc(db, 'businesses', appId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBizStatus(data.status || 'active');
                setBizName(data.name || 'Negocio');
                setBizSubtitle(data.subtitle || '');
                setBizAdminEmail(data.adminEmail || '');
                if (data.name) document.title = data.name;
            } else {
                // Handle case where business ID in URL doesn't exist in DB
                // For now, we allow it to load (assuming it's a legacy or manual artifact), 
                // but in strict mode we might block it.
                document.title = "Barberos - Plataforma";
            }
        });

        // 2. Data Subscriptions
        const u1 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'services')), s => { if (s.empty) { const b = writeBatch(db); DEFAULT_SERVICES.forEach(sv => b.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'services')), sv)); b.commit(); } else setServices(s.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const u2 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'appointments')), s => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u3 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'blocked_slots')), s => setBlockedSlots(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u4 = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), s => { if (s.exists()) setAdminSettings(s.data()); });
        return () => { unsubBiz(); u1(); u2(); u3(); u4(); };
    }, [user, refreshKey]);

    useEffect(() => { if (!user?.isAdmin) return; const interval = setInterval(() => { const now = new Date(); appointments.forEach(a => { if (a.status === 'cancelada') return; const diff = Math.floor((parseTime(a.time, a.date) - now) / 60000); if (diff === 15) { const msg = `Cita con ${a.userName} en 15 min.`; setNotifications(p => p.some(x => x.appId === a.id) ? p : [{ id: Date.now(), appId: a.id, title: 'Recordatorio', message: msg, read: false, time: 'Ahora' }, ...p]); } }); }, 60000); return () => clearInterval(interval); }, [appointments, user]);

    // Derived Data
    const todayStr = new Date().toLocaleDateString('en-CA');

    const takenTimes = useMemo(() => { if (!selDate) return []; const apptTimes = appointments.filter(a => a.date === selDate && a.status !== 'cancelada' && a.id !== editId).map(a => a.time); const blocks = blockedSlots.filter(b => b.date === selDate); const isFullDayBlocked = blocks.some(b => b.wholeDay); const adminBlockedTimes = blocks.flatMap(b => b.times || []); if (isFullDayBlocked) return currentTimeSlots; return [...new Set([...apptTimes, ...adminBlockedTimes])]; }, [selDate, appointments, editId, blockedSlots, currentTimeSlots]);
    const isDayFull = useMemo(() => { if (!selDate) return false; const blocks = blockedSlots.filter(b => b.date === selDate); if (blocks.some(b => b.wholeDay)) return true; return takenTimes.length >= currentTimeSlots.length; }, [selDate, blockedSlots, takenTimes, currentTimeSlots]);
    const clientApps = useMemo(() => (!user) ? [] : appointments.filter(a => user.isGuest ? a.userPhone === user.phone : a.userId === user.uid).sort((a, b) => parseTime(a.time, a.date) - parseTime(b.time, b.date)), [appointments, user]);

    const adminApps = useMemo(() => {
        let res = [...appointments].filter(a => a.status !== 'completed');
        if (searchTerm.trim()) {
            const cs = cleanPhoneForSearch(searchTerm), ts = normalizeText(searchTerm);
            res = res.filter(a => (cs && cleanPhoneForSearch(a.userPhone).includes(cs)) || normalizeText(a.userName).includes(ts));
        }
        return res.sort((a, b) => parseTime(a.time, a.date) - parseTime(b.time, b.date));
    }, [appointments, searchTerm]);

    const downloadCSV = (data) => {
        if (!data.length) return showToast('No hay datos', 'error');
        const headers = ["Fecha", "Hora", "Cliente", "Teléfono", "Servicio", "Precio", "Estado", "Tipo"];
        const rows = data.map(a => [
            a.date,
            a.time,
            `"${a.userName ? a.userName.replace(/"/g, '""') : ''}"`,
            a.userPhone,
            `"${a.serviceTitle ? a.serviceTitle.replace(/"/g, '""') : ''}"`,
            a.price,
            a.status,
            a.isGuestBooking ? 'Invitado' : 'Registrado'
        ]);
        rows.push([]);
        rows.push(['', '', '', '', 'TOTAL VENTAS', data.reduce((a, c) => a + (c.price || 0), 0), '', '']);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `reporte_barberia_yoel_${new Date().toISOString().split('T')[0]}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!appId) {
        if (isSuperAdmin) return <SuperAdminDashboard onLogout={() => setIsSuperAdmin(false)} />;
        return <LandingView onSuperAdminLogin={() => setIsSuperAdmin(true)} />;
    }

    if (bizStatus === 'suspended') return <PaymentPendingView name={bizName} />;

    if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold">CARGANDO...</div>;

    if (!user || !user.displayName) return <AuthScreen onLogin={u => {
        const isAuthAdmin = (u.email && ((bizAdminEmail && u.email === bizAdminEmail) || u.email === ADMIN_EMAIL));
        const fullUser = { ...auth.currentUser, ...u, isAdmin: isAuthAdmin };
        setUser(fullUser);
        setView(isAuthAdmin ? 'admin' : 'home');
    }} deferredPrompt={deferredPrompt} handleInstallClick={handleInstall} bizName={bizName} subtitle={bizSubtitle} />;

    // RENDERERS
    const renderHome = () => (<div className="pb-24 animate-fade-in"> <div className="relative h-64 bg-slate-800 mb-6 overflow-hidden rounded-b-3xl shadow-xl flex items-end p-6"> <img src="https://i.postimg.cc/FRFN6xdB/wmremove-transformed.png" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Barber Background" /> <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" /> <div className="relative z-20"> <h2 className="text-amber-500 font-bold text-xs tracking-widest uppercase mb-1">{bizSubtitle || 'Professional Barber'}</h2> <h1 className="text-3xl font-extrabold leading-none">{bizName ? bizName.split(' ')[0].toUpperCase() : 'ESTILO'}<br />{bizName && bizName.split(' ').length > 1 ? bizName.split(' ').slice(1).join(' ').toUpperCase() : 'QUE DEFINE.'}</h1> {user?.isGuest && <div className="mt-2 inline-block bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/50">MODO INVITADO</div>} </div> </div> <div className="px-6 space-y-4"> <div className="flex gap-4"><button onClick={() => setView('book')} className="flex-1 bg-amber-500 py-4 rounded-2xl text-slate-900 font-bold shadow-lg flex flex-col items-center gap-1"><Calendar /><span className="text-xs">RESERVAR</span></button><button onClick={() => setView('appointments')} className="flex-1 bg-slate-800 py-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-1"><Clock /><span className="text-xs">MIS CITAS</span></button></div> <h3 className="font-bold text-lg">Servicios</h3> <div className="space-y-3">{services.map(s => <div key={s.id} className="bg-slate-800 p-4 rounded-xl flex items-center gap-4 border border-slate-700"><div className="text-amber-500 bg-slate-900 p-3 rounded-xl">{getIcon(s.iconName)}</div><div className="flex-1"><h4 className="font-bold">{s.title}</h4><p className="text-xs text-slate-400">RD$ {s.price}</p><p className="text-[10px] text-slate-500 line-clamp-1">{s.description}</p></div><button onClick={() => { setSelService(s); setView('book'); }} className="bg-slate-700 p-2 rounded-lg hover:bg-amber-500 hover:text-slate-900"><ChevronRight /></button></div>)}</div> </div> </div>);

    const renderBooking = (isKioskMode = false) => (
        <div className={`animate-fade-in ${!isKioskMode && 'pb-24 px-6 pt-20'} ${isKioskMode && 'h-screen bg-slate-900 p-6 flex flex-col'}`}>
            {isKioskMode && <button onClick={() => setView('kiosk')} className="mb-4 text-slate-500"><X size={32} /></button>}
            <div className="flex justify-between mb-6 items-center"><h2 className="text-2xl font-bold">{editId ? 'Editar' : 'Nueva'} Cita</h2>{editId && <button onClick={() => { setEditId(null); setOrigBooking(null); setSelService(null); }} className="text-xs text-red-400 underline">Cancelar</button>}</div>
            {user?.isAdmin && !editId && !isKioskMode && (
                <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-xs text-amber-500 font-bold uppercase mb-2">Datos del Cliente</p>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" placeholder="Teléfono" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                        <button onClick={handleLookupClient} className="bg-slate-700 p-2 rounded-lg text-slate-300"><Search size={18} /></button>
                    </div>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white" placeholder="Nombre del cliente" value={manualName} onChange={e => setManualName(e.target.value)} />
                    <div className="pt-2 border-t border-slate-700 mt-2">
                        <p className="text-xs text-slate-400 mb-2">Duración de atención</p>
                        <div className="flex gap-2">
                            <button onClick={() => setBookingDuration('15 min')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${bookingDuration === '15 min' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>15 min</button>
                            <button onClick={() => setBookingDuration('30 min')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${bookingDuration === '30 min' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>30 min</button>
                            <button onClick={() => setBookingDuration('45 min')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${bookingDuration === '45 min' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>45 min</button>
                        </div>
                    </div>
                </div>
            )}
            {!selService ? (<div className="space-y-3 overflow-y-auto flex-1">{services.map(s => (<div key={s.id} onClick={() => setSelService(s)} className="bg-slate-800 active:bg-slate-700 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 active:scale-95 transition-transform"><div className="flex gap-4 items-center"><div className="text-amber-500 bg-slate-900 p-3 rounded-xl">{getIcon(s.iconName)}</div><div><h3 className="font-bold">{s.title}</h3><p className="text-amber-500 font-bold text-sm">RD$ {s.price}</p></div></div>{s.description && <p className="text-xs text-slate-400 pl-[60px]">{s.description}</p>}</div>))}</div>) : (
                <div className="animate-fade-in flex-1 flex flex-col">
                    <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-amber-500 mb-6"><div className="flex justify-between items-center mb-2"><div><p className="text-xs text-slate-400">Servicio</p><h3 className="font-bold">{selService.title}</h3></div><button onClick={() => setSelService(null)}><RefreshCw size={14} /></button></div>{selService.description && <div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-300 flex gap-2 border border-slate-700/50"><Info size={14} className="text-amber-500 shrink-0 mt-0.5" /> {selService.description}</div>}</div>
                    {isKioskMode ? <div className="mb-6"><p className="text-slate-400 text-sm mb-2">Fecha</p><div className="text-xl font-bold text-white bg-slate-800 p-3 rounded-xl border border-slate-700">HOY ({new Date().toLocaleDateString()})</div></div> : <><label className="block text-sm font-bold mb-2 ml-1 text-slate-300">FECHA</label><div className="relative mb-6"><input type="date" min={new Date().toISOString().split('T')[0]} value={selDate} onChange={e => setSelDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white cursor-pointer" /><Calendar className="absolute right-4 top-4 text-amber-500 pointer-events-none" size={24} /></div></>}
                    {(selDate || isKioskMode) && (isDayFull && !isKioskMode ? <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-400 mb-8"><AlertCircle className="min-w-[20px] mt-0.5" /><div><p className="font-bold text-sm">No disponible</p></div></div> : <div className="mb-8"><label className="block text-sm font-bold mb-2 ml-1 text-slate-300">HORA</label><div className="grid grid-cols-3 gap-2">{currentTimeSlots.map(t => { const dt = isKioskMode ? new Date().toISOString().split('T')[0] : selDate; const disabled = takenTimes.includes(t) || isPastTime(t, dt); return (<button key={t} disabled={disabled} onClick={() => setSelTime(t)} className={`py-3 rounded-lg text-xs font-bold border ${disabled ? 'bg-slate-800/50 text-slate-600 border-slate-800 line-through opacity-50 cursor-not-allowed' : selTime === t ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{t}</button>) })}</div></div>)}
                    <div className="mt-auto"><button disabled={(!selDate && !isKioskMode) || !selTime} onClick={() => { if (isKioskMode) { setSelDate(new Date().toISOString().split('T')[0]); setTimeout(() => handleBook(kioskTempUser), 100); } else handleBook(); }} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl disabled:bg-slate-800 disabled:text-slate-600 shadow-lg">CONFIRMAR</button></div>
                </div>
            )}
        </div>
    );

    const renderClientAppointments = () => (
        <div className="pb-24 px-6 pt-20 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Mis Citas</h2>
            {clientApps.length === 0 ?
                <div className="text-center py-20 opacity-50"><Calendar size={64} className="mx-auto mb-4" /><p>No tienes citas.</p><button onClick={() => setView('book')} className="mt-4 text-amber-500 underline">Agendar</button></div>
                :
                <div className="space-y-4">
                    {clientApps.map(a => {
                        const isCompleted = a.status === 'completed';
                        return (
                            <div key={a.id} className={`bg-slate-800 p-5 rounded-2xl border border-slate-700 ${isCompleted ? 'opacity-75' : ''}`}>
                                <div className="flex justify-between mb-2">
                                    <h3 className="font-bold">{a.serviceTitle}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${isCompleted ? 'bg-gray-600 text-white' : 'bg-green-500/20 text-green-400'}`}>{isCompleted ? 'ATENDIDO' : a.status}</span>
                                </div>
                                <p className="text-amber-500 font-bold mb-2">RD$ {a.price}</p>
                                <div className="flex gap-4 text-sm text-slate-400 mb-4"><span>{a.date}</span><span>{a.time}</span></div>

                                {isCompleted ? (
                                    <button onClick={() => {
                                        setSelService(services.find(s => s.id === a.serviceId) || services[0]);
                                        setEditId(null); // New booking
                                        setOrigBooking(null);
                                        setSelDate('');
                                        setSelTime('');
                                        setView('book');
                                    }} className="w-full py-3 bg-amber-500 rounded-lg text-slate-900 font-bold text-sm flex items-center justify-center gap-2">
                                        <RefreshCw size={16} /> ¿VOLVER A AGENDAR?
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={e => handleCancel(e, a.id)} className="flex-1 py-2 bg-slate-900 rounded-lg text-red-400 text-xs font-bold border border-red-900">CANCELAR</button>
                                        <button onClick={() => handleStartReschedule(a)} className="flex-1 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">REAGENDAR</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            }
        </div>
    );
    const renderProfile = () => (<div className="pb-24 px-6 pt-20 animate-fade-in"> <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700 mb-6"><div className="w-24 h-24 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-amber-500"><User className="w-10 h-10 text-amber-500" /></div><h2 className="text-2xl font-bold">{user.displayName}</h2><p className="text-sm text-slate-500">{user.email || user.phone}</p>{user.isGuest && <span className="inline-block mt-2 bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded">INVITADO</span>}</div> <button onClick={handleLogout} className="w-full border border-red-500/30 text-red-400 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/10"><LogOut size={18} /> Cerrar Sesión</button> </div>);

    const renderContent = () => {
        if (user?.isAdmin) {
            if (view === 'services') return (
                <div className="pb-24 px-4 pt-20 animate-fade-in">
                    <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Servicios</h2><button onClick={() => { setEditingService(null); setShowServiceModal(true); }} className="p-2 bg-amber-500 rounded-full text-slate-900"><Plus /></button></div>
                    <div className="space-y-3">{services.map(s => (<div key={s.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700"><div className="flex gap-4 items-center"><div className="bg-slate-900 p-3 rounded-xl text-amber-500">{getIcon(s.iconName)}</div><div><h4 className="font-bold">{s.title}</h4><p className="text-slate-400 text-sm">RD$ {s.price}</p></div></div><div className="flex gap-2"><button onClick={() => { setEditingService(s); setShowServiceModal(true); }} className="p-2 bg-slate-700 rounded-lg text-blue-400"><Edit2 size={18} /></button><button onClick={() => handleDeleteService(s.id)} className="p-2 bg-slate-700 rounded-lg text-red-400"><Trash2 size={18} /></button></div></div>))}</div>
                </div>
            );
            if (view === 'revenue') return <RevenueView appointments={appointments} downloadCSV={downloadCSV} services={services} />;
            if (view === 'change_password') return <ChangePasswordView onCancel={() => setView('profile')} onSave={async (newPass) => { try { await updatePassword(auth.currentUser, newPass); showToast('Contraseña actualizada'); setView('profile'); } catch (e) { showToast('Error (Re-login requerido)', 'error'); } }} />;
            if (view === 'book') return renderBooking();
            if (view === 'notifications') return (
                <div className="pb-24 px-6 pt-20 animate-fade-in">
                    <h2 className="text-2xl font-bold mb-6">Notificaciones</h2>
                    {notifications.map(n => <div key={n.id} className="bg-slate-800 p-4 rounded-xl border-l-4 border-blue-500 flex gap-3 mb-3"><Bell className="text-blue-500" /><div><h4 className="font-bold text-sm">{n.title}</h4><p className="text-xs text-slate-400">{n.message}</p></div></div>)}
                </div>
            );
            if (view === 'blocks') return <BlockScheduleView blockedSlots={blockedSlots} onSaveBlock={handleSaveBlock} onDeleteBlock={handleDeleteBlock} timeSlots={currentTimeSlots} />;
            if (view === 'kiosk') return <KioskView appointments={appointments} onExit={() => setView('admin')} onExpress={startKioskBooking} bizName={bizName} subtitle={bizSubtitle} />;
            if (view === 'kiosk_auth') return <KioskAuth setView={setView} handleKioskGuestLogin={handleKioskGuestLogin} />;
            if (view === 'kiosk_book') return renderBooking(true);
            if (view === 'profile') return <AdminProfileView settings={adminSettings} onSaveSettings={handleSaveSettings} onChangePass={() => setView('change_password')} bizName={bizName} bizSubtitle={bizSubtitle} onSaveBrand={handleSaveBrand} />;


            const activeList = adminApps.filter(a => a.date >= todayStr);
            const pastList = adminApps.filter(a => a.date < todayStr);

            return (
                <div className="pb-24 px-4 pt-20 animate-fade-in">
                    <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold">Panel Admin</h2><p className="text-xs text-slate-400">Bienvenido, Yoel</p></div><div className="flex gap-2"><button onClick={enterKioskMode} className="relative p-2 bg-slate-800 rounded-full border border-slate-700 text-amber-500"><Monitor size={20} /></button><button onClick={() => setView('notifications')} className="relative p-2 bg-slate-800 rounded-full border border-slate-700"><Bell size={20} />{notifications.filter(n => !n.read).length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full" />}</button></div></div>
                    <div className="relative mb-4"><Search className="absolute left-3 top-3.5 text-slate-500" size={18} /><input className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 text-white outline-none focus:border-amber-500" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />{searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 text-slate-500"><X size={18} /></button>}</div>
                    {searchTerm && <div className="flex justify-between items-center mb-6 text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-700"><span>Mostrando {adminApps.length}</span><button onClick={() => setSearchTerm('')} className="text-amber-500 underline">Ver todas</button></div>}
                    <div className="grid grid-cols-2 gap-4 mb-8"><div className="bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex items-center gap-2 text-slate-400 mb-2"><Calendar size={16} /><span className="text-xs font-bold">Citas</span></div><p className="text-2xl font-bold">{adminApps.length}</p></div><div className="bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex items-center gap-2 text-slate-400 mb-2"><DollarSign size={16} /><span className="text-xs font-bold">Ingresos</span></div><p className="text-2xl font-bold text-amber-500">RD$ {adminApps.reduce((a, c) => a + (c.price || 0), 0).toLocaleString()}</p></div></div>
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-white"><Clock size={18} className="text-amber-500" /> Agenda <button onClick={handleManualRefresh} className={`ml-2 hover:text-amber-500 ${isSpinning ? 'spin-anim text-amber-500' : 'text-slate-500'}`}><RefreshCw size={16} /></button> <button onClick={() => { setView('book'); setManualName(''); setManualPhone(''); }} className="ml-auto bg-amber-500 text-slate-900 p-1 rounded-lg"><Plus size={16} /></button></h3>
                    <div className="space-y-3">{activeList.map(a => (<div key={a.id} className="bg-slate-800 p-4 rounded-xl border-l-4 border-amber-500 relative"><div className="flex justify-between items-start"><div><h4 className="font-bold text-white">{a.userName} {a.isGuestBooking && <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300">INVITADO</span>}</h4><p className="text-xs text-slate-400 font-mono mt-0.5 flex gap-1 items-center"><Phone size={10} /> {formatPhone(a.userPhone)}</p><div className="mt-2 text-sm font-medium text-amber-500">{a.serviceTitle}</div></div><div className="text-right"><p className="font-bold text-lg text-white">{a.time}</p><p className="text-xs text-slate-500">{a.date}</p></div></div><div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end gap-3"><button onClick={(e) => handleComplete(e, a.id)} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-500/20"><Check size={12} /> ATENDIDO</button><button onClick={() => handleStartReschedule(a)} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1"><RefreshCw size={12} /> EDITAR</button><button onClick={e => handleCancel(e, a.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> BORRAR</button></div></div>))} {activeList.length === 0 && <div className="text-center py-10 opacity-50"><Filter className="mx-auto mb-2" /><p>No hay resultados activos.</p></div>}</div>
                    {pastList.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-700/50">
                            <h3 className="font-bold mb-4 text-slate-500 text-xs uppercase tracking-widest">Citas Pasadas (Pendientes)</h3>
                            <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                                {pastList.map(a => (
                                    <div key={a.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative">
                                        <div className="flex justify-between items-start">
                                            <div><h4 className="font-bold text-white">{a.userName} <span className="text-xs text-amber-500">({a.date})</span></h4><p className="text-xs text-slate-400">{a.time} - {a.serviceTitle}</p></div>
                                            <div className="flex gap-2">
                                                <button onClick={(e) => handleComplete(e, a.id)} className="p-2 bg-green-500/10 text-green-400 rounded-lg"><Check size={16} /></button>
                                                <button onClick={e => handleCancel(e, a.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (view === 'home') return renderHome();
        if (view === 'book') return renderBooking();
        if (view === 'appointments') return renderClientAppointments();
        if (view === 'profile') return renderProfile();
        return renderHome();
    };

    return (
        <div className="min-h-screen bg-slate-900 font-sans text-white pb-safe">
            {view !== 'kiosk' && view !== 'kiosk_auth' && view !== 'kiosk_book' && (
                <header className="fixed top-0 w-full bg-slate-900/95 backdrop-blur z-40 px-6 h-16 flex justify-between items-center border-b border-slate-800"><div className="flex items-center gap-2"><Scissors className="text-amber-500" /><span className="font-bold text-xl">{bizName ? bizName.toUpperCase() : 'BARBEROS'}</span></div></header>
            )}
            <main className={view.startsWith('kiosk') ? '' : 'min-h-screen pt-16'}>{renderContent()}</main>
            {view !== 'kiosk' && view !== 'kiosk_auth' && view !== 'kiosk_book' && (
                <nav className="fixed bottom-0 w-full bg-slate-800/95 backdrop-blur border-t border-slate-700 pb-safe px-6 h-20 flex justify-between items-center z-50 shadow-2xl">
                    {user?.isAdmin ? (
                        <div className="w-full flex justify-around">
                            <NavItem i={Home} l="Panel" id="admin" activeId={view} onSelect={setView} />
                            <NavItem i={Settings} l="Config" id="profile" activeId={view} onSelect={setView} />
                            <NavItem i={TrendingUp} l="Ingresos" id="revenue" activeId={view} onSelect={setView} />
                            <NavItem i={Lock} l="Bloqueos" id="blocks" activeId={view} onSelect={setView} />
                            <button onClick={handleLogout} className="text-red-400 flex flex-col items-center"><LogOut /><span className="text-[10px] font-bold">Salir</span></button>
                        </div>
                    ) : (
                        <><NavItem i={Home} l="Inicio" id="home" activeId={view} onSelect={setView} /><NavItem i={Calendar} l="Agendar" id="book" activeId={view} onSelect={setView} /><NavItem i={Clock} l="Citas" id="appointments" activeId={view} onSelect={setView} /><NavItem i={User} l="Perfil" id="profile" activeId={view} onSelect={setView} /></>
                    )}
                </nav>
            )}
            <ServiceModal show={showServiceModal} onClose={() => setShowServiceModal(false)} onSave={handleSaveService} initialData={editingService} />
            <SuccessModal show={showSuccessModal} onClose={() => {
                setShowSuccessModal(false);
                if (view === 'kiosk_book') setView('kiosk');
                else setView('appointments');
            }} appointmentDetails={lastBookedApp} allAppointments={appointments} isKiosk={view === 'kiosk_book'} />
            <UpdateToast registration={swRegistration} />

            {/* MODAL DE CONFIRMACIÓN */}
            <ConfirmModal
                show={confirmData.show}
                msg={confirmData.msg}
                onConfirm={() => { confirmData.action && confirmData.action(); setConfirmData({ show: false, msg: '', action: null }); }}
                onCancel={() => setConfirmData({ show: false, msg: '', action: null })}
            />

            {toast && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-bounce-in px-4 w-full max-w-sm"><div className={`text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{toast.type === 'success' ? <CheckCircle size={24} /> : <X size={24} />} {toast.msg}</div></div>}
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);

