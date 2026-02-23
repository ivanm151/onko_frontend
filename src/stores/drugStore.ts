import { searchService } from '../services/drugService';
import { makeAutoObservable } from 'mobx';

type Parameter = 'Cmax' | 'AUC' | 'T1/2' | 'CVintra';

export class SearchStore {
    project_id: string | null = null;
    status: 'idle' | 'searching' | 'completed' | 'failed' = 'idle';
    drugName: string = '';
    testDrug: string = '';
    referenceDrug: string = '';

    reportStatus: 'idle' | 'generating' | 'ready' | 'failed' = 'idle';
    reportBlob: Blob | null = null;

    parameters: {
        cmax: number | null;
        auc: number | null;
        t_half: number | null;
        cv_intra: number | null;
    } = {
        cmax: null,
        auc: null,
        t_half: null,
        cv_intra: null,
    };

    articles: Array<{
        id: string;
        authors: string;
        journal: string;
        params: Parameter[];
        dataString: string;
    }> = [];

    excipients: string[] = [];
    dosage: string = '';
    form: string = '';

    constructor() {
        makeAutoObservable(this);
    }

    setSearching() {
        this.status = 'searching';
        this.project_id = null;
    }

    setCompleted() {
        this.status = 'completed';
    }

    setFailed() {
        this.status = 'failed';
    }

    setProjectId(id: string) {
        this.project_id = id;
    }

    setGenerating() {
        this.reportStatus = 'generating';
        this.reportBlob = null;
    }

    setReportReady(blob: Blob) {
        this.reportStatus = 'ready';
        this.reportBlob = blob;
    }

    setReportFailed() {
        this.reportStatus = 'failed';
    }

    async generateReport() {
        if (!this.project_id) return;

        // Проверяем, можно ли генерировать
        try {
            const response = await searchService.getProjectStatus(this.project_id);
            const hasParameters = Array.isArray(response.parameters) && response.parameters.length > 0;
            const validStatuses = ['completed', 'design_failed', 'pdf_processed'];

            if (!validStatuses.includes(response.status.toLowerCase()) || !hasParameters) {
                this.setReportFailed();
                console.error('🛑 Нельзя генерировать отчёт: данные недоступны');
                return;
            }
        } catch (error) {
            this.setReportFailed();
            console.error('🚨 Не удалось проверить статус перед генерацией:', error);
            return;
        }

        this.setGenerating();

        try {
            await searchService.generateReport(this.project_id);
            this.pollDownloadReport(this.project_id);
        } catch (error) {
            this.setReportFailed();
            console.error('Failed to start report generation:', error);
        }
    }

    async pollDownloadReport(projectId: string) {
        const MAX_RETRIES = 30;
        let attempts = 0;

        const poll = async () => {
            attempts++;
            console.log(`🔁 Polling download attempt ${attempts}/${MAX_RETRIES}`);

            if (attempts > MAX_RETRIES) {
                this.setReportFailed();
                console.error('🛑 Report download polling timed out');
                return;
            }

            try {
                const blob = await searchService.downloadReport(projectId);
                this.setReportReady(blob);

                // Автоматически скачиваем
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.drugName}_synopsis.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error: any) {
                if (error.message === 'not_ready') {
                    setTimeout(poll, 1000);
                } else {
                    this.setReportFailed();
                }
            }
        };

        poll();
    }

    setResult(data: any) {
        // Устанавливаем имя препарата, если ещё не установлено
        if (!this.drugName && data.inn_en) {
            this.drugName = data.inn_en;
        } else {
            this.drugName = this.drugName || 'Неизвестный препарат';
        }

        // Очищаем параметры
        const newParameters = {
            cmax: null as number | null,
            auc: null as number | null,
            t_half: null as number | null,
            cv_intra: null as number | null,
        };

        // Маппинг параметров
        const paramKeyMap: Record<string, keyof typeof newParameters> = {
            cmax: 'cmax',
            auc: 'auc',
            't½': 't_half',
            't1/2': 't_half',
            't_half': 't_half',
            'cv_intra': 'cv_intra',
            'cv': 'cv_intra',
            'cvintra': 'cv_intra',
        };

        // Собираем статьи и усреднённые значения
        const articles: Array<{
            id: string;
            authors: string;
            journal: string;
            params: Parameter[];
            dataString: string;
        }> = [];

        data.parameters?.forEach((p: any, i: number) => {
            const key = p.parameter.toLowerCase();
            const value = parseFloat(p.value);
            const mappedKey = paramKeyMap[key];

            if (mappedKey && !isNaN(value)) {
                // Обновляем параметр, если это первый попавшийся или более надёжный
                if (newParameters[mappedKey] === null || p.is_reliable) {
                    newParameters[mappedKey] = value;
                }
            }

            // Создаём статью
            const paramShort = key === 'cmax' ? 'Cmax' :
                key === 'auc' ? 'AUC' :
                    key === 't½' || key === 't1/2' || key === 't_half' ? 'T1/2' :
                        key === 'cv_intra' || key === 'cvintra' || key === 'cv' ? 'CVintra' : null;

            if (!paramShort) return;

            articles.push({
                id: String(i + 1),
                authors: p.source || 'Источник',
                journal: 'Клиническое исследование',
                params: [paramShort as Parameter],
                dataString: `${p.parameter} ${p.value} ${p.unit}`,
            });
        });

        // Устанавливаем CVintra по умолчанию, если не найдено
        newParameters.cv_intra = newParameters.cv_intra ?? 25;

        this.parameters = newParameters;
        this.articles = articles;

        // Устанавливаем препараты
        if (!this.referenceDrug) this.referenceDrug = this.drugName;
        if (!this.testDrug) this.testDrug = this.drugName;

        console.log('✅ Данные успешно установлены:', this);
    }

    // Обновлённый метод: убран excipientMatch
    async startSearch(
        inn_en: string,
        inn_ru: string,
        dosage: string,
        form: string,
        excipients: string[] = []
    ) {
        this.setSearching();
        this.excipients = excipients;
        this.dosage = dosage;   // ← сохраняем
        this.form = form;       // ← сохраняем
        this.drugName = inn_en;

        try {
            const response = await searchService.startSearch({
                inn_en,
                inn_ru: inn_en,
                dosage,
                form,
                additional_substances: excipients, // ← ключевой момент
            });
            this.setProjectId(response.project_id);
            this.pollStatus(response.project_id);
        } catch (error) {
            this.setFailed();
            console.error('Start search failed:', error);
        }
    }

    async pollStatus(projectId: string) {
        const MAX_RETRIES = 60;
        let attempts = 0;

        const poll = async () => {
            attempts++;
            console.log(`🔁 Polling attempt ${attempts}/${MAX_RETRIES}, status: ${this.status}`);

            if (attempts > MAX_RETRIES) {
                this.setFailed();
                console.error('🛑 Polling stopped: timeout after 60 seconds');
                return;
            }

            try {
                const response = await searchService.getProjectStatus(projectId);

                // Проверяем, есть ли параметры
                const hasParameters = Array.isArray(response.parameters) && response.parameters.length > 0;

                // Допустимые статусы для успешного завершения
                const validStatuses = ['completed', 'design_failed', 'pdf_processed'];

                if (validStatuses.includes(response.status.toLowerCase()) && hasParameters) {
                    this.setResult(response);
                    this.setCompleted();
                    return;
                }

                // Если статус failed или design_failed без данных — ошибка
                if (response.status.toLowerCase() === 'failed' ||
                    (response.status.toLowerCase() === 'design_failed' && !hasParameters)) {
                    this.setFailed();
                    return;
                }

                // Продолжаем поллинг
                if (response.status.toLowerCase() === 'pending') {
                    setTimeout(poll, 1000);
                } else {
                    console.warn('⚠️ Неизвестный статус:', response.status);
                    setTimeout(poll, 1000);
                }
            } catch (error) {
                console.error('🚨 Ошибка при поллинге:', error);
                this.setFailed();
            }
        };

        poll();
    }

    setParam(key: 'cmax' | 'auc' | 't_half' | 'cv_intra', value: number | null) {
        this.parameters[key] = value;
    }

    setTestDrug(name: string) {
        this.testDrug = name;
    }

    setReferenceDrug(name: string) {
        this.referenceDrug = name;
    }

    async startSearchFromPdf(file: File) {
        this.setSearching();

        try {
            const response = await searchService.uploadPdf(file);
            this.setProjectId(response.project_id);
            this.pollStatus(response.project_id); // ← поллим так же, как и для обычного поиска
        } catch (error) {
            this.setFailed();
            console.error('PDF upload failed:', error);
        }
    }
}

export const searchStore = new SearchStore();