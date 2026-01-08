"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Calculator, Info, Layers, Droplets,
    ArrowRight, Beaker, Settings, RefreshCw
} from 'lucide-react';

interface MeshData {
    name: string;
    volume: number;
}

const MESH_DATA: MeshData[] = [
    { name: 'M-280', volume: 3 },
    { name: 'M-250', volume: 5.9 },
    { name: 'M-230', volume: 9.1 },
    { name: 'M-200(Y)', volume: 15 },
    { name: 'M-180', volume: 19.8 },
    { name: 'M-150', volume: 21.7 },
    { name: 'M-130', volume: 25.2 },
    { name: 'M-120', volume: 34.7 },
    { name: 'M-110', volume: 35 },
    { name: 'M-100', volume: 37.7 },
    { name: 'M-95', volume: 47.1 },
    { name: 'M-90', volume: 49.6 },
    { name: 'M-80', volume: 61.5 },
    { name: 'M-70', volume: 78.5 },
    { name: 'M-60', volume: 89.3 },
    { name: 'M-50', volume: 100 },
    { name: 'M-45', volume: 139 },
    { name: 'M-42', volume: 120 },
    { name: 'M-40', volume: 116 },
    { name: 'M-30', volume: 150 },
    { name: 'M-20', volume: 174 },
    { name: 'M-20Y', volume: 207 },
    { name: 'M-18', volume: 288 },
    { name: 'M-16', volume: 331 },
];

export default function GravureCoating() {
    const [selectedMeshName, setSelectedMeshName] = useState(MESH_DATA[5].name); // Default M-150
    const [ratioProduct, setRatioProduct] = useState<number | string>('');
    const [ratioHardener, setRatioHardener] = useState<number | string>('');
    const [productSolids, setProductSolids] = useState<number | string>('');
    const [targetThickness, setTargetThickness] = useState<number | string>('');

    const [containerWidth, setContainerWidth] = useState<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    // Initial width
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setContainerWidth(window.innerWidth);
        }
    }, []);

    const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (node) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setContainerWidth(entry.contentRect.width);
                }
            });
            resizeObserver.observe(node);
            observerRef.current = resizeObserver;
        }
    }, []);

    const isSmall = containerWidth > 0 && containerWidth < 680;

    const transferRate = 0.3; // 30% fixed

    const results = useMemo(() => {
        const mesh = MESH_DATA.find(m => m.name === selectedMeshName) || MESH_DATA[0];
        const volume = mesh.volume;

        const pRatio = Number(ratioProduct) || 0;
        const hRatio = Number(ratioHardener) || 0;
        const pSolids = Number(productSolids) || 0;
        const tThickness = Number(targetThickness) || 0;

        // 1. 혼합전 고형분 (%)
        // (제품 비율 * 제품 고형분/100 + 경화제 비율 * 1.0) / (제품 비율 + 경화제 비율)
        const totalBaseMix = pRatio + hRatio;
        if (totalBaseMix === 0) return { solidsIncludingAdditives: 0, currentThickness: 0, targetSolidPercent: 0, solventToAdd: 0, volume };

        const totalBaseSolids = (pRatio * (pSolids / 100)) + (hRatio * 1.0);
        const solidsIncludingAdditives = (totalBaseSolids / totalBaseMix) * 100;

        // 2. 현재 도포 두께 (희석 전) (μm)
        // 용적 * 전이율 * 고형분
        const currentThickness = volume * transferRate * (solidsIncludingAdditives / 100);

        // 3. 타겟 고형분 (%)
        // 두께 = 용적 * 전이율 * 고형분 -> 고형분 = 두께 / (용적 * 전이율)
        const targetSolidPercent = (tThickness / (volume * transferRate)) * 100;

        // 4. 추가할 용제량 (Solvent to Add)
        // 타겟 고형분 = 제품고형분합 / (혼합전총량 + 용제)
        const solventToAdd = targetSolidPercent > 0 ? (totalBaseSolids / (targetSolidPercent / 100)) - totalBaseMix : 0;

        return {
            solidsIncludingAdditives,
            currentThickness,
            targetSolidPercent,
            solventToAdd: Math.max(0, solventToAdd),
            volume
        };
    }, [selectedMeshName, ratioProduct, ratioHardener, productSolids, targetThickness]);

    return (
        <div ref={containerRefCallback} className="flex flex-col h-full bg-[#f4f7fa] text-slate-800 font-sans overflow-y-auto">
            {/* Header */}
            <div className={`text-center ${isSmall ? 'p-6 pt-8' : 'p-8 pt-10'}`}>
                <h1 className={`${isSmall ? 'text-xl' : 'text-3xl'} font-black text-slate-900 tracking-tight flex items-center justify-center gap-3`}>
                    그라비아 도포 셋팅 자동화
                </h1>
                <p className={`text-slate-400 font-medium ${isSmall ? 'text-xs' : 'text-sm'} mt-2`}>Gravure Coating Parameters Calculator</p>
            </div>

            <div className={`${isSmall ? 'px-4 pb-6' : 'px-6 md:px-10 pb-10'} space-y-6 max-w-5xl mx-auto w-full`}>
                <div className={`grid grid-cols-1 ${isSmall ? '' : 'lg:grid-cols-2'} gap-6`}>

                    {/* Input Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`bg-white rounded-[32px] ${isSmall ? 'p-6' : 'p-8'} shadow-xl shadow-slate-200/50 border border-white/50 backdrop-blur-sm`}
                    >
                        <div className="flex items-center gap-2 mb-8 text-indigo-500 font-bold">
                            <Settings size={20} />
                            <span>입력 (Input)</span>
                        </div>

                        <div className="space-y-6">
                            {/* Mesh Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 ml-1">사용메쉬롤 (목수)</label>
                                <div className="relative">
                                    <select
                                        value={selectedMeshName}
                                        onChange={(e) => setSelectedMeshName(e.target.value)}
                                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                                    >
                                        {MESH_DATA.map(m => (
                                            <option key={m.name} value={m.name}>{m.name} (Vol: {m.volume})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                        <Layers size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Ratio Product:Hardener */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 ml-1">제품 : 경화제(첨가제) 비율</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            value={ratioProduct}
                                            onChange={(e) => setRatioProduct(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 pr-12 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">제품</span>
                                    </div>
                                    <span className="font-bold text-slate-300 text-xl">:</span>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            value={ratioHardener}
                                            onChange={(e) => setRatioHardener(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 pr-14 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">경화제</span>
                                    </div>
                                </div>
                            </div>

                            {/* Solids & Target Thickness */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 ml-1">제품고형분 (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={productSolids}
                                            onChange={(e) => setProductSolids(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 pr-10 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 ml-1">타겟도포 (Target μm)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={targetThickness}
                                            onChange={(e) => setTargetThickness(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 pr-10 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 italic text-[10px]">μm</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Result Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`bg-white rounded-[32px] ${isSmall ? 'p-6' : 'p-8'} shadow-xl shadow-slate-200/50 border border-white/50 flex flex-col`}
                    >
                        <div className="flex items-center gap-2 mb-8 text-indigo-500 font-bold">
                            <Calculator size={20} />
                            <span>계산 결과 (Result)</span>
                        </div>

                        <div className="flex-1 flex flex-col gap-4">
                            {/* Highlight Result */}
                            <div className="bg-slate-800 rounded-2xl p-6 text-center shadow-lg shadow-slate-300">
                                <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">추가할 용제량 (Solvent to Add)</p>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-4xl font-black text-white">{results.solventToAdd.toFixed(2)}</span>
                                    <span className="text-white/50 font-bold text-xl ml-1">Kg</span>
                                </div>
                            </div>

                            {/* Smaller Cards Group */}
                            <div className="grid grid-cols-2 gap-3 flex-1">
                                <div className="bg-[#f8faff] rounded-2xl p-4 flex flex-col justify-center items-center border border-indigo-50/50">
                                    <p className="text-[10px] font-black text-indigo-400/70 mb-1 uppercase tracking-tighter">타겟고형분 (%)</p>
                                    <p className="text-xl font-black text-indigo-900">{results.targetSolidPercent.toFixed(2)} <span className="text-xs text-indigo-300">%</span></p>
                                </div>
                                <div className="bg-[#f8faff] rounded-2xl p-4 flex flex-col justify-center items-center border border-indigo-50/50">
                                    <p className="text-[10px] font-black text-indigo-400/70 mb-1 uppercase tracking-tighter">현재도께 (Current μm)</p>
                                    <p className="text-xl font-black text-indigo-900">{results.currentThickness.toFixed(2)} <span className="text-xs text-indigo-300">μm</span></p>
                                </div>
                                <div className="bg-[#f8faff] rounded-2xl p-4 flex flex-col justify-center items-center border border-indigo-50/50">
                                    <p className="text-[10px] font-black text-indigo-400/70 mb-1 uppercase tracking-tighter">첨가제포함 고형분 (%)</p>
                                    <p className="text-xl font-black text-indigo-900">{results.solidsIncludingAdditives.toFixed(2)} <span className="text-xs text-indigo-300">%</span></p>
                                </div>
                                <div className="bg-[#f8faff] rounded-2xl p-4 flex flex-col justify-center items-center border border-indigo-50/50 text-center">
                                    <p className="text-[10px] font-black text-indigo-400/70 mb-1 uppercase tracking-tighter">희석비율 (제 : 경 : 용)</p>
                                    <p className="text-sm font-black text-indigo-900 leading-tight">
                                        {ratioProduct} : {ratioHardener} : <span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-4">{results.solventToAdd.toFixed(1)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Visualization Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-[32px] ${isSmall ? 'p-6' : 'p-10'} shadow-xl shadow-slate-200/50 border border-white/50 text-center relative overflow-hidden`}
                >
                    <div className="relative z-10">
                        <h3 className={`font-black text-slate-800 ${isSmall ? 'text-sm mb-6' : 'text-lg mb-8'} flex items-center justify-center gap-2`}>
                            <Beaker size={20} className="text-indigo-500" />
                            혼합 비율 시각화
                        </h3>

                        <div className={`flex flex-col ${isSmall ? 'gap-8' : 'md:flex-row gap-12'} items-center justify-center`}>
                            {/* Beaker Graphic */}
                            <div className={`relative ${isSmall ? 'w-32 h-44' : 'w-48 h-64'}`}>
                                <div className="absolute inset-0 bg-slate-50 border-4 border-slate-200 rounded-b-3xl rounded-t-xl overflow-hidden flex flex-col font-sans">
                                    {/* Empty space at the top (optional, to keep some gap) */}
                                    <div className="flex-1" />

                                    {/* Liquid Stack (Top to Bottom: Solvent -> Hardener -> Product) */}
                                    {/* Container for liquid to handle flex-col (showing bottom as bottom) */}
                                    <div className="flex flex-col-reverse w-full" style={{ height: '90%' }}>
                                        {/* Product Layer */}
                                        <div
                                            className="w-full bg-indigo-600 transition-all duration-500 ease-out flex items-center justify-center border-t border-indigo-500/30 overflow-hidden"
                                            style={{ height: `${((Number(ratioProduct) || 0) / (results.solventToAdd + (Number(ratioProduct) || 0) + (Number(ratioHardener) || 0))) * 100}%` }}
                                        >
                                            <span className={`font-black text-white/90 whitespace-nowrap ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>제품 {ratioProduct || 0}</span>
                                        </div>

                                        {/* Hardener Layer */}
                                        <div
                                            className="w-full bg-orange-500 transition-all duration-500 ease-out flex items-center justify-center border-t border-orange-400/30 overflow-hidden"
                                            style={{ height: `${((Number(ratioHardener) || 0) / (results.solventToAdd + (Number(ratioProduct) || 0) + (Number(ratioHardener) || 0))) * 100}%` }}
                                        >
                                            <span className={`font-black text-white/90 whitespace-nowrap ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>경화제 {ratioHardener || 0}</span>
                                        </div>

                                        {/* Solvent Layer */}
                                        <div
                                            className="w-full bg-cyan-400/50 transition-all duration-500 ease-out flex items-center justify-center border-t border-cyan-500/30 overflow-hidden"
                                            style={{ height: `${(results.solventToAdd / (results.solventToAdd + (Number(ratioProduct) || 0) + (Number(ratioHardener) || 0))) * 100}%` }}
                                        >
                                            <span className={`font-black text-cyan-900/70 whitespace-nowrap ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>용제 {results.solventToAdd.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Lip of beaker */}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[110%] h-4 bg-slate-100 border-2 border-slate-200 rounded-full" />
                            </div>

                            {/* Legend */}
                            <div className="flex flex-col gap-4 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded bg-cyan-400/40 border border-cyan-400" />
                                    <span className="text-sm font-bold text-slate-600">용제 (Solvent)</span>
                                    <span className="text-xs text-slate-400 font-mono underline decoration-cyan-200 decoration-2">{results.solventToAdd.toFixed(2)} Kg</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded bg-orange-500" />
                                    <span className="text-sm font-bold text-slate-600">경화제 (Hardener)</span>
                                    <span className="text-xs text-slate-400 font-mono">{ratioHardener || 0} Kg</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded bg-indigo-600" />
                                    <span className="text-sm font-bold text-slate-600">제품 (Main Layer)</span>
                                    <span className="text-xs text-slate-400 font-mono">{ratioProduct || 0} Kg</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-50 rounded-full blur-3xl opacity-50" />
                </motion.div>
            </div>

            {/* Footer */}
            <div className="p-8 text-center text-slate-300 text-[10px] font-bold tracking-widest uppercase border-t border-slate-100 bg-white/50">
                KOS v7 Gravure System • Advanced Calculation Node
            </div>
        </div>
    );
}
