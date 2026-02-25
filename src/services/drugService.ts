interface DesignCalculateRequest {
    cv_intra: number;
    tmax?: number;
    t_half?: number;
    power?: number;
    alpha?: number;
    dropout_rate?: number;
    screen_fail_rate?: number;
    project_id?: string;
    desired_design?: string;
}

export interface DesignResult {
    sample_size: number;
    recruitment_size: number;
    design_type: string;
    cv_intra: number;
    power: number;
    alpha: number;
    dropout_rate: number;
    screen_fail_rate: number;
    washout_days: number;
    critical_parameters: {
        cv_intra: number;
        tmax: number;
        t_half: number;
    };
    design_explanation: string;
    randomization_scheme: string;
}

interface SearchStartRequest {
    inn_en: string;
    inn_ru: string;
    dosage: string;
    form: string;
    additional_substances?: string[];
}

interface UploadPdfResponse {
    project_id: string;
    status: string;
    message: string;
    parameters_found: number;
}

interface SearchStartResponse {
    project_id: string;
    status: string;
    message: string;
}

interface ParameterSchema {
    parameter: string;
    value: string;
    unit: string;
    source: string;
    is_reliable: boolean;
}

interface ProjectStatusResponse {
    project_id: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    parameters?: ParameterSchema[];
    sources_count: number;
    created_at: string;
    updated_at: string;
}

interface GenerateReportResponse {
    message: string;
    report_id: string;
}

interface DownloadReportResponse {
    // Сервер может вернуть URL или бинарный файл
    // В данном случае — предположим, что возвращает DOCX напрямую
}
//const API_BASE = 'https://prodready.pro/api/v1'
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1';

export const searchService = {
    async startSearch(data: SearchStartRequest): Promise<SearchStartResponse> {
        console.log('🔍 Отправка запроса на поиск:', data);
        try {
            const response = await fetch(`${API_BASE}/search/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка от сервера:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: SearchStartResponse = await response.json();
            console.log('✅ Поиск запущен:', result);
            return result;
        } catch (error) {
            console.error('🚨 Ошибка при старте поиска:', error);
            throw error;
        }
    },

    async getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
        console.log('🔄 Поллинг статуса:', projectId);
        try {
            const response = await fetch(`${API_BASE}/search/results/${projectId}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка получения статуса:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: ProjectStatusResponse = await response.json();
            console.log('📊 Получен ответ:', result);
            return result;
        } catch (error) {
            console.error('🚨 Ошибка при поллинге:', error);
            throw error;
        }
    },

    async generateReport(projectId: string): Promise<GenerateReportResponse> {
        console.log('📄 Генерация отчёта для:', projectId);

        // Сначала проверим статус проекта
        const statusResponse = await fetch(`${API_BASE}/search/results/${projectId}`, {
            method: 'GET',
        });

        if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: Не удалось получить статус`);
        }

        const statusData: ProjectStatusResponse = await statusResponse.json();
        const validStatuses = ['completed', 'design_failed', 'pdf_processed'];

        if (!validStatuses.includes(statusData.status.toLowerCase())) {
            throw new Error(`Project not ready. Current status: ${statusData.status}`);
        }

        if (statusData.status.toLowerCase() === 'pdf_processed' && (!statusData.parameters || statusData.parameters.length === 0)) {
            throw new Error('Project has no parameters to generate report.');
        }

        // Теперь отправляем запрос на генерацию
        const response = await fetch(`${API_BASE}/reports/${projectId}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка генерации отчёта:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result: GenerateReportResponse = await response.json();
        console.log('✅ Отчёт начат:', result);
        return result;
    },

    async downloadReport(projectId: string): Promise<Blob> {
        console.log('⬇️ Запрос на скачивание отчёта:', projectId);
        try {
            const response = await fetch(`${API_BASE}/reports/${projectId}/download`, {
                method: 'GET',
            });

            // @ts-ignore
            if (!response.status === 200) {
                if (response.status === 404 || response.status === 400) {
                    // Не готово
                    throw new Error('not_ready');
                }
                const errorText = await response.text();
                console.error('❌ Ошибка скачивания:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const blob = await response.blob();
            return blob;
        } catch (error: any) {
            if (error.message === 'not_ready') {
                throw error; // Для поллинга
            }
            console.error('🚨 Ошибка при скачивании:', error);
            throw error;
        }
    },

    async uploadPdf(file: File): Promise<UploadPdfResponse> {
        console.log('📤 Загрузка PDF:', file.name);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/upload/pdf`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка загрузки PDF:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: UploadPdfResponse = await response.json();
            console.log('✅ PDF обработан:', result);
            return result;
        } catch (error) {
            console.error('🚨 Ошибка при загрузке PDF:', error);
            throw error;
        }
    },

    async calculateDesign(data: DesignCalculateRequest): Promise<DesignResult> {
        console.log('📐 Расчёт дизайна:', data);
        try {
            const response = await fetch(`${API_BASE}/design/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка расчёта дизайна:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: DesignResult = await response.json();
            console.log('✅ Дизайн рассчитан:', result);
            return result;
        } catch (error) {
            console.error('🚨 Ошибка при расчёте дизайна:', error);
            throw error;
        }
    },

    async getDesignResult(projectId: string): Promise<DesignResult> {
        console.log('🔄 Получение результата дизайна:', projectId);
        try {
            const response = await fetch(`${API_BASE}/design/${projectId}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка получения дизайна:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: DesignResult = await response.json();
            console.log('✅ Результат дизайна:', result);
            return result;
        } catch (error) {
            console.error('🚨 Ошибка при получении дизайна:', error);
            throw error;
        }
    },
};