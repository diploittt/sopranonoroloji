import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { MessageSquare, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import '@/components/admin/AdminPanel.css';

interface WordsTabProps {
    socket: Socket | null;
}

interface WordEntry {
    id: string;
    badWord: string;
    replacement: string;
    createdAt: string;
}

function ToastPortal({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null;
    return createPortal(
        <div className="admin-toast-container">
            <div className={`admin-toast ${msg.type}`}>{msg.text}</div>
        </div>,
        document.body
    );
}

export function WordsTab({ socket }: WordsTabProps) {
    const [words, setWords] = useState<WordEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [newReplacement, setNewReplacement] = useState('***');
    const [adding, setAdding] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadWords = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getWordFilters();
            setWords(Array.isArray(data) ? data : data.wordFilters || []);
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadWords(); }, [loadWords]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWord.trim()) return;
        setAdding(true);
        try {
            await adminApi.createWordFilter({ badWord: newWord.trim(), replacement: newReplacement.trim() || '***' });
            showStatus('success', `"${newWord}" eklendi.`);
            setNewWord('');
            setNewReplacement('***');
            loadWords();
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (wordId: string) => {
        try {
            await adminApi.removeWordFilter(wordId);
            showStatus('success', 'Kelime silindi.');
            if (selectedId === wordId) setSelectedId(null);
            loadWords();
        } catch (e: any) {
            showStatus('error', e.message);
        }
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const selectedWord = words.find(w => w.id === selectedId);

    return (
        <div className="admin-split" style={{ position: 'relative' }}>
            <ToastPortal msg={toastMsg} />

            <div className="admin-split-left">
                <div className="admin-toolbar">
                    <MessageSquare style={{ width: 13, height: 13, color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Yasaklı Kelimeler</span>
                    <div style={{ flex: 1 }} />
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadWords} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12, ...(loading ? { animation: 'adminSpin 0.6s linear infinite' } : {}) }} />
                    </button>
                </div>

                {loading ? (
                    <div className="admin-loading"><div className="admin-spinner" /> Yükleniyor...</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>Kelime</th><th>Yerine</th><th>Tarih</th><th style={{ width: 40 }}></th></tr></thead>
                            <tbody>
                                {words.map(word => (
                                    <tr key={word.id} className={selectedId === word.id ? 'selected' : ''} onClick={() => setSelectedId(word.id)}>
                                        <td style={{ fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '4px 8px', borderRadius: 4 }}>{word.badWord}</td>
                                        <td style={{ fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '4px 8px', borderRadius: 4 }}>{word.replacement}</td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{new Date(word.createdAt).toLocaleDateString('tr-TR')}</td>
                                        <td>
                                            <button className="admin-btn admin-btn-danger admin-btn-icon admin-btn-sm" onClick={(e) => { e.stopPropagation(); handleRemove(word.id); }} title="Sil">
                                                <Trash2 style={{ width: 11, height: 11 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {words.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#1e293b' }}>Yasaklı kelime yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(148,163,184,0.12)', fontSize: 12, color: '#1e293b', flexShrink: 0 }}>
                    Toplam: {words.length} kelime
                </div>
            </div>

            <div className="admin-split-right">
                <div className="admin-detail-header">
                    <div className="header-accent" />
                    Kelime Ekle
                </div>

                <div className="admin-info-card">
                    <p style={{ marginBottom: 14 }}>Bu kelimeler sohbette otomatik olarak belirlediğiniz metin ile değiştirilecektir.</p>
                    <form onSubmit={handleAdd}>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>Yasaklı Kelime</label>
                                <input type="text" value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Yasaklı kelime..." />
                            </div>
                            <div className="admin-form-group">
                                <label>Yerine Yazılacak</label>
                                <input type="text" value={newReplacement} onChange={e => setNewReplacement(e.target.value)} placeholder="*** (varsayılan)" />
                            </div>
                        </div>
                        <button type="submit" className="admin-btn admin-btn-success" disabled={adding || !newWord.trim()} style={{ marginTop: 4 }}>
                            <Plus style={{ width: 13, height: 13 }} />
                            {adding ? 'Ekleniyor...' : 'Ekle'}
                        </button>
                    </form>
                </div>

                {selectedWord && (
                    <>
                        <div className="admin-divider" />
                        <div className="admin-detail-header" style={{ fontSize: 13 }}>
                            <div className="header-accent" />
                            Kelime Detayı
                        </div>
                        <div className="admin-info-card">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Yasaklı Kelime</div>
                                    <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 700 }}>{selectedWord.badWord}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Yerine</div>
                                    <div style={{ fontSize: 14, color: '#059669', fontWeight: 700 }}>{selectedWord.replacement}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Eklenme Tarihi</div>
                                    <div style={{ fontSize: 12, color: '#334155' }}>{new Date(selectedWord.createdAt).toLocaleString('tr-TR')}</div>
                                </div>
                            </div>
                        </div>
                        <button className="admin-btn admin-btn-danger" onClick={() => handleRemove(selectedWord.id)} style={{ marginTop: 8 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                            Sil
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
