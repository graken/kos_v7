"use client";

import { useState, useEffect, useCallback } from 'react';
import { useOSStore } from '@/store/useOSStore';

export default function Calculator() {
    const { focusedWindowId } = useOSStore();
    const isFocused = focusedWindowId === 'calculator';

    const [display, setDisplay] = useState('0');
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [pressedKey, setPressedKey] = useState<string | null>(null);

    const formatNumber = (numStr: string) => {
        const [integerPart, decimalPart] = numStr.split('.');
        const signedInteger = integerPart.startsWith('-') ? integerPart : integerPart;
        const formattedInteger = parseInt(integerPart.replace(/,/g, '') || "0").toLocaleString('ko-KR');

        if (numStr === '-') return '-';
        if (decimalPart !== undefined) return `${formattedInteger}.${decimalPart}`;
        return formattedInteger;
    };

    const inputDigit = useCallback((digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    }, [display, waitingForOperand]);

    const inputDot = useCallback(() => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
        } else if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    }, [display, waitingForOperand]);

    const clearAll = useCallback(() => {
        setDisplay('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    }, []);

    const toggleSign = useCallback(() => {
        setDisplay(display.startsWith('-') ? display.substring(1) : '-' + display);
    }, [display]);

    const performOperation = useCallback((nextOperator: string) => {
        const inputValue = parseFloat(display);

        if (prevValue === null) {
            setPrevValue(inputValue);
        } else if (operator) {
            const currentValue = prevValue || 0;
            let newValue = currentValue;

            switch (operator) {
                case '+': newValue = currentValue + inputValue; break;
                case '-': newValue = currentValue - inputValue; break;
                case '*': newValue = currentValue * inputValue; break;
                case '/': newValue = currentValue / inputValue; break;
            }

            setPrevValue(newValue);
            setDisplay(String(newValue));
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    }, [display, operator, prevValue]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFocused) return;

            let key = e.key;
            if (key === 'Enter') key = '=';
            if (key === '/') key = '÷';
            if (key === '*') key = '×';
            if (key === 'Escape') key = 'AC';
            setPressedKey(key);

            if (/[0-9]/.test(e.key)) {
                inputDigit(e.key);
            } else if (e.key === '.') {
                inputDot();
            } else if (e.key === '+') {
                performOperation('+');
            } else if (e.key === '-') {
                performOperation('-');
            } else if (e.key === '*') {
                performOperation('*');
            } else if (e.key === '/') {
                performOperation('/');
            } else if (e.key === 'Enter' || e.key === '=') {
                performOperation('=');
            } else if (e.key === 'Backspace') {
                setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
            } else if (e.key === 'Escape') {
                clearAll();
            }
        };

        const handleKeyUp = () => {
            setPressedKey(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isFocused, display, inputDigit, inputDot, performOperation, clearAll]);

    const buttons = [
        { label: 'AC', onClick: clearAll, className: 'bg-black/10' },
        { label: '+/-', onClick: toggleSign, className: 'bg-black/10' },
        { label: '%', onClick: () => setDisplay(String(parseFloat(display) / 100)), className: 'bg-black/10' },
        { label: '÷', onClick: () => performOperation('/'), className: 'bg-orange-500 text-white' },
        { label: '7', onClick: () => inputDigit('7') },
        { label: '8', onClick: () => inputDigit('8') },
        { label: '9', onClick: () => inputDigit('9') },
        { label: '×', onClick: () => performOperation('*'), className: 'bg-orange-500 text-white' },
        { label: '4', onClick: () => inputDigit('4') },
        { label: '5', onClick: () => inputDigit('5') },
        { label: '6', onClick: () => inputDigit('6') },
        { label: '-', onClick: () => performOperation('-'), className: 'bg-orange-500 text-white' },
        { label: '1', onClick: () => inputDigit('1') },
        { label: '2', onClick: () => inputDigit('2') },
        { label: '3', onClick: () => inputDigit('3') },
        { label: '+', onClick: () => performOperation('+'), className: 'bg-orange-500 text-white' },
        { label: '0', onClick: () => inputDigit('0'), className: 'col-span-2' },
        { label: '.', onClick: inputDot },
        { label: '=', onClick: () => performOperation('='), className: 'bg-orange-500 text-white' },
    ];

    return (
        <div className="flex flex-col h-full bg-black/5 p-4 select-none text-black/80">
            {/* Display Area */}
            <div className="flex-[0_0_110px] flex flex-col justify-center items-end p-5 mb-4 bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                <div className="h-4 flex items-center mb-1">
                    <span className="text-xs text-black/40 font-sans font-medium">
                        {prevValue !== null ? `${prevValue.toLocaleString('ko-KR')} ${operator === '=' ? '' : (operator === '*' ? '×' : operator === '/' ? '÷' : operator)}` : ''}
                    </span>
                </div>
                <div className="w-full flex items-center justify-end overflow-hidden">
                    <span
                        className="text-black/90 font-sans [font-variant-numeric:tabular-nums] text-right transition-all duration-200 whitespace-nowrap px-1"
                        style={{
                            fontSize: display.length > 12 ? '1.25rem' : display.length > 10 ? '1.75rem' : display.length > 8 ? '2.25rem' : '2.75rem',
                            fontWeight: 400,
                        }}
                        title={display}
                    >
                        {formatNumber(display)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {buttons.map((btn, i) => {
                    const isPressed = pressedKey === btn.label;
                    return (
                        <button
                            key={i}
                            onClick={btn.onClick}
                            className={`
                                h-14 rounded-xl text-lg font-medium transition-all flex items-center justify-center focus:outline-none
                                ${btn.className?.includes('col-span') ? `${btn.className} bg-white/60 hover:bg-white/80 text-black/80` : (btn.className || 'bg-white/60 hover:bg-white/80 text-black/80')}
                                ${isPressed ? 'scale-90 brightness-90' : 'active:scale-95'}
                            `}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
