import dynamic from 'next/dynamic';
import { WindowConfig } from '@/store/useOSStore';

interface AppDefinition {
    component: React.ComponentType;
    config: WindowConfig;
    name: string;
    permissions?: { id: string; name: string; description?: string }[];
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
    settings: {
        component: dynamic(() => import('@/apps/Settings/Settings')),
        config: {
            defaultWidth: 800,
            defaultHeight: 500,
            resizable: true,
            maximizable: true
        },
        name: 'Settings',
        permissions: [
            { id: 'create', name: '항목 추가 권한', description: '제품이나 파트 등 새로운 기초 데이터를 등록할 수 있습니다.' },
            { id: 'edit', name: '정보 수정 권한', description: '등록된 기초 데이터의 명칭이나 설정을 변경할 수 있습니다.' },
            { id: 'delete', name: '데이터 삭제 권한', description: '기초 데이터를 시스템에서 삭제할 수 있습니다.' }
        ]
    },
    calculator: {
        component: dynamic(() => import('@/apps/Calculator/Calculator')),
        config: {
            defaultWidth: 320,
            defaultHeight: 520,
            resizable: false,
            maximizable: false
        },
        name: 'Calculator'
    },
    'app-editor': {
        component: dynamic(() => import('@/apps/AppEditor/AppEditor')),
        config: {
            defaultWidth: 400,
            defaultHeight: 500,
            resizable: false,
            maximizable: false
        },
        name: 'App Editor'
    },
    'coating-control': {
        component: dynamic(() => import('@/apps/CoatingControl/CoatingControl')),
        config: {
            defaultWidth: 800,
            defaultHeight: 600,
            resizable: true,
            maximizable: true
        },
        name: '박막도포관리',
        permissions: [
            { id: 'create', name: '기록 등록 권한', description: 'OCR 분석 후 측정 데이터를 최종적으로 저장할 수 있습니다.' },
            { id: 'edit', name: '기록 수정 권한', description: '이미 저장된 측정 기록의 수치를 변경할 수 있습니다.' },
            { id: 'delete', name: '기록 삭제 권한', description: '저장된 측정 기록을 삭제할 수 있습니다.' },
            { id: 'save', name: '데이터 확정 권한', description: '수정된 데이터를 최종적으로 확정 저장합니다.' },
            { id: 'photo', name: '사진 촬영 권한', description: '측정표 사진을 직접 업로드하거나 붙여넣을 수 있습니다.' }
        ]
    },
    'gravure-coating': {
        component: dynamic(() => import('@/apps/GravureCoating/GravureCoating')),
        config: {
            defaultWidth: 800,
            defaultHeight: 850,
            resizable: true,
            maximizable: true
        },
        name: '그라비아 도포',
        permissions: [
            { id: 'create', name: '계산 기록 저장', description: '도포 계산 결과를 이력으로 저장할 수 있습니다.' },
            { id: 'edit', name: '이력 수정 권한', description: '저장된 도포 계산 정보를 수정할 수 있습니다.' },
            { id: 'delete', name: '이력 삭제 권한', description: '저장된 도포 이력을 삭제할 수 있습니다.' }
        ]
    },
    'roll-calculator': {
        component: dynamic(() => import('@/apps/RollCalculator/RollCalculator')),
        config: {
            defaultWidth: 900,
            defaultHeight: 850,
            resizable: true,
            maximizable: true
        },
        name: '롤직경계산기'
    },
    'equipment-maintenance': {
        component: dynamic(() => import('@/apps/EquipmentMaintenance/EquipmentMaintenance')),
        config: {
            defaultWidth: 1200,
            defaultHeight: 800,
            resizable: true,
            maximizable: true
        },
        name: '설비점검',
        permissions: [
            { id: 'create', name: '점검 이력 작성', description: '새로운 설비 점검 일지를 작성하고 등록할 수 있습니다.' },
            { id: 'edit', name: '점검 기록 수정', description: '작성된 점검 기록의 내용을 변경할 수 있습니다.' },
            { id: 'delete', name: '점검 기록 삭제', description: '점검 기록을 영구적으로 삭제할 수 있습니다.' },
            { id: 'complete', name: '점검 완료 처리', description: '점검 상태를 "완료"로 변경할 수 있는 권한입니다.' }
        ]
    },
    'user-manager': {
        component: dynamic(() => import('@/apps/UserManager/UserManager')),
        config: {
            defaultWidth: 1000,
            defaultHeight: 700,
            resizable: true,
            maximizable: true
        },
        name: '사용자 관리'
    },
    'notepad': {
        component: dynamic(() => import('@/apps/Notepad/Notepad')),
        config: {
            defaultWidth: 1000,
            defaultHeight: 700,
            resizable: true,
            maximizable: true
        },
        name: '메모장',
        permissions: [
            { id: 'create', name: '메모 작성 권한', description: '새로운 메모를 작성하고 저장할 수 있습니다.' },
            { id: 'edit', name: '메모 수정 권한', description: '기존 메모의 내용을 수정할 수 있습니다.' },
            { id: 'delete', name: '메모 삭제 권한', description: '작성된 메모를 삭제할 수 있습니다.' }
        ]
    },
    'shinsung-data': {
        component: dynamic(() => import('@/apps/ShinsungData/ShinsungData')),
        config: {
            defaultWidth: 1100,
            defaultHeight: 800,
            resizable: true,
            maximizable: true
        },
        name: '신성데이터',
        permissions: [
            { id: 'create', name: '데이터 등록 권한', description: 'OCR 분석 결과를 최종 데이터로 등록할 수 있습니다.' },
            { id: 'edit', name: '데이터 수정 권한', description: '등록된 데이터의 상세 수치를 수정할 수 있습니다.' },
            { id: 'delete', name: '데이터 삭제 권한', description: '저장된 신성데이터 기록을 삭제할 수 있습니다.' }
        ]
    },
    'work-plan': {
        component: dynamic(() => import('@/apps/WorkPlan/WorkPlan')),
        config: {
            defaultWidth: 1100,
            defaultHeight: 850,
            resizable: true,
            maximizable: true
        },
        name: '작업계획서',
        permissions: [
            { id: 'create', name: '작업 추가 권한', description: '달력에 새로운 작업 일정을 추가할 수 있습니다.' },
            { id: 'edit', name: '작업 수정/순서 변경', description: '작업 상세 정보를 수정하거나 드래그하여 순서를 바꿀 수 있습니다.' },
            { id: 'delete', name: '작업 삭제 권한', description: '등록된 작업 일정을 휴지통으로 버리거나 삭제할 수 있습니다.' },
            { id: 'save', name: '전체 일정 저장', description: '변경된 순서나 일정을 서버와 최종 동기화합니다.' },
            { id: 'delete_record', name: '일정 영구 삭제', description: '휴지통 이동 대신 기록을 영구적으로 제거할 수 있습니다.' }
        ]
    }
};

export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
    defaultWidth: 800,
    defaultHeight: 500,
    resizable: true,
    maximizable: true
};
