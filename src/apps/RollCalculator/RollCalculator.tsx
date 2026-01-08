"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Calculator, Info, Ruler, Weight,
    ArrowRight, Settings, Box, Database
} from 'lucide-react';

export default function RollCalculator() {
    // Material Composition (Thickness in μm)
    const [baseThickness, setBaseThickness] = useState<number | string>('');
    const [adhesiveThickness, setAdhesiveThickness] = useState<number | string>('');
    const [linerThickness, setLinerThickness] = useState<number | string>('');

    // Roll Specification
    const [width, setWidth] = useState<number | string>('');
    const [length, setLength] = useState<number | string>('');
    const [coreOD, setCoreOD] = useState<number | string>('');
    const [coreWeight, setCoreWeight] = useState<number | string>('');

    const [containerWidth, setContainerWidth] = useState<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    // Constants (Densities)
    const baseDensity = 1.4;
    const adhesiveDensity = 1.0;
    const linerDensity = 1.4;

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

    const isSmall = containerWidth > 0 && containerWidth < 768;

    const results = useMemo(() => {
        const tBase = Number(baseThickness) || 0;
        const tAdh = Number(adhesiveThickness) || 0;
        const tLin = Number(linerThickness) || 0;
        const rWidth = Number(width) || 0;
        const rLength = Number(length) || 0;
        const rCoreOD = Number(coreOD) || 0;
        const rCoreWeight = Number(coreWeight) || 0;

        // Total Thickness (μm)
        const totalThickness = tBase + tAdh + tLin;

        // Unit Weights (kg/m²) = thickness(mm) * density = (thickness(μm)/1000) * density
        const uwBase = (tBase / 1000) * baseDensity;
        const uwAdh = (tAdh / 1000) * adhesiveDensity;
        const uwLin = (tLin / 1000) * linerDensity;
        const totalUnitWeight = uwBase + uwAdh + uwLin;

        // Material Weight (kg) = Width(m) * Length(m) * UnitWeight(kg/m²)
        const materialWeight = (rWidth / 1000) * rLength * totalUnitWeight;
        const totalWeight = materialWeight + rCoreWeight;

        // Final OD (mm) = sqrt( CoreOD^2 + (4000 * L * T / PI) )
        // Formula derivation: Volume of material = Area of ring * Width
        // Area of ring = PI * (R^2 - r^2) = L * T
        // R^2 = (L * T / PI) + r^2 -> D = 2 * R = 2 * sqrt( (L * T / PI) + (d/2)^2 ) = sqrt( (4 * L * T / PI) + d^2 )
        // Since T is in μm and L is in m, L*T needs multiplier 4000
        const finalOD = Math.sqrt(Math.pow(rCoreOD, 2) + (4000 * rLength * (totalThickness / 1000) / Math.PI));

        return {
            totalThickness,
            totalWeight,
            materialWeight,
            finalOD,
            details: [
                { label: '기재', tMm: tBase / 1000, uw: uwBase },
                { label: '점착제', tMm: tAdh / 1000, uw: uwAdh },
                { label: '이형필름', tMm: tLin / 1000, uw: uwLin }
            ],
            totalUnitWeight
        };
    }, [baseThickness, adhesiveThickness, linerThickness, width, length, coreOD, coreWeight]);

    return (
        <div ref={containerRefCallback} className="flex flex-col h-full bg-[#f4f7fa] text-slate-800 font-sans overflow-y-auto">
            {/* Header */}
            <div className={`p-8 border-b border-slate-200 bg-white flex items-center gap-4 ${isSmall ? 'flex-col text-center' : ''}`}>
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Calculator size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">롤 직경/무게 계산기</h1>
                    <p className="text-slate-400 font-medium text-sm">Roll Diameter & Weight Calculator</p>
                </div>
            </div>

            <div className={`flex-1 p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full`}>
                <div className={`grid grid-cols-1 ${isSmall ? '' : 'lg:grid-cols-2'} gap-8`}>

                    {/* Left Column: Inputs */}
                    <div className="space-y-6">
                        {/* Material Construction */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100"
                        >
                            <div className="flex items-center gap-2 mb-6 text-indigo-500 font-bold">
                                <Database size={18} />
                                <span>재료 구성 (두께)</span>
                            </div>

                            <p className="text-xs text-slate-400 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                각 층의 두께를 μm 단위로 입력하세요.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { label: '기재 (비중 1.4)', val: baseThickness, set: setBaseThickness },
                                    { label: '점착제 (비중 1.0)', val: adhesiveThickness, set: setAdhesiveThickness },
                                    { label: '이형필름 (비중 1.4)', val: linerThickness, set: setLinerThickness }
                                ].map((item, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">{item.label}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.val}
                                                onChange={(e) => item.set(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">μm</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                                <p className="font-black text-indigo-600">총 두께: {results.totalThickness.toFixed(1)} μm</p>
                            </div>
                        </motion.div>

                        {/* Roll Specification */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100"
                        >
                            <div className="flex items-center gap-2 mb-6 text-indigo-500 font-bold">
                                <Ruler size={18} />
                                <span>롤 규격</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">원단 폭 (Width)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={width}
                                            onChange={(e) => setWidth(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">mm</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">권취 길이 (Length)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">m</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">지관 외경 (Core OD)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={coreOD}
                                            onChange={(e) => setCoreOD(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">mm</span>
                                    </div>
                                    <p className="text-[10px] text-slate-300 ml-1">3인치 ≈ 96mm, 6인치 ≈ 172mm</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">지관 무게 (Core Weight)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={coreWeight}
                                            onChange={(e) => setCoreWeight(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">kg</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Results */}
                    <div className="space-y-6">
                        {/* Main Result Cards */}
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[24px] p-8 text-white shadow-xl shadow-indigo-200"
                            >
                                <p className="text-indigo-100/70 text-xs font-bold mb-1 uppercase tracking-widest text-center">최종 롤 지름 (OD)</p>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-black">{results.finalOD ? results.finalOD.toFixed(1) : '0.0'}</span>
                                    <span className="text-indigo-200 font-bold text-xl">mm</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[24px] p-8 text-white shadow-xl shadow-emerald-200"
                            >
                                <p className="text-emerald-100/70 text-xs font-bold mb-1 uppercase tracking-widest text-center">총 중량 (WEIGHT)</p>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-black">{results.totalWeight ? results.totalWeight.toFixed(2) : '0.00'}</span>
                                    <span className="text-emerald-200 font-bold text-xl">kg</span>
                                </div>
                                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between text-xs font-bold text-emerald-100/80">
                                    <div className="text-center flex-1">
                                        <p>원단 무게</p>
                                        <p className="text-white mt-1">{results.materialWeight.toFixed(2)} kg</p>
                                    </div>
                                    <div className="w-[1px] bg-white/10 h-8 mt-1" />
                                    <div className="text-center flex-1">
                                        <p>지관 무게</p>
                                        <p className="text-white mt-1">{(Number(coreWeight) || 0).toFixed(2)} kg</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Detailed Info Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex-1"
                        >
                            <div className="flex items-center gap-2 mb-6 text-slate-500 font-bold">
                                <Info size={18} />
                                <span>상세 정보</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 border-b border-slate-50">
                                            <th className="text-left py-3 font-bold">항목</th>
                                            <th className="text-right py-3 font-bold">두께 (mm)</th>
                                            <th className="text-right py-3 font-bold">단위무게 (kg/m²)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700">
                                        {results.details.map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-50/50">
                                                <td className="py-3 font-bold">{row.label}</td>
                                                <td className="py-3 text-right font-mono">{row.tMm.toFixed(4)}</td>
                                                <td className="py-3 text-right font-mono">{row.uw.toFixed(4)}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-black text-indigo-600 bg-indigo-50/30">
                                            <td className="py-4 px-2 rounded-l-xl">합계</td>
                                            <td className="py-4 text-right font-mono">{(results.totalThickness / 1000).toFixed(4)}</td>
                                            <td className="py-4 text-right font-mono rounded-r-xl pr-2">{results.totalUnitWeight.toFixed(4)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 text-center text-slate-300 text-[10px] font-bold tracking-widest uppercase bg-white/50 border-t border-slate-100">
                Roll Calculation Node • KOS v7 System
            </div>
        </div>
    );
}
