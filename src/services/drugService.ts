interface SearchStartRequest {
    inn_en: string;
    inn_ru: string;
    dosage: string;
    form: string;
    excipients?: string[];
    excipient_match?: number;
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

const API_BASE = 'http://141.98.189.19:8000/api/v1';

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
        try {
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
        } catch (error) {
            console.error('🚨 Ошибка при генерации отчёта:', error);
            throw error;
        }
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
};