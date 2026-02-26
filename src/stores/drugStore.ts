import { searchService, DesignResult } from '../services/drugService';
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
        params: Array<{ key: Parameter; value: string; unit: string }>;
        dataString: string;
    }> = [];

    excipients: string[] = [];
    dosage: string = '';
    form: string = '';

    // Новое: результат расчёта дизайна
    designResult: DesignResult | null = null;

    // Добавьте в начало store
    dropoutRate = 20;
    screenFail = 12;
    power = 80;
    alpha = 0.05;

    // Флаг состояния
    designStatus: 'idle' | 'calculating' | 'completed' | 'failed' = 'idle';


    constructor() {
        makeAutoObservable(this);
    }

    setDesignCalculating() {
        this.designStatus = 'calculating';
    }

    setDesignCompleted(result: DesignResult) {
        this.designResult = result;
        this.designStatus = 'completed';
    }

    setDesignFailed() {
        this.designStatus = 'failed';
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

        this.setGenerating(); // reportStatus = 'generating'

        try {
            // Только запускаем генерацию — НЕ скачиваем!
            await searchService.generateReport(this.project_id);

            // Начинаем поллинг скачивания
            this.pollReportDownload(this.project_id);
        } catch (error) {
            this.setReportFailed();
            console.error('❌ Не удалось запустить генерацию отчёта:', error);
        }
    }

// Новый метод: поллинг скачивания отчёта
    async pollReportDownload(projectId: string) {
        const MAX_RETRIES = 180; // 180 секунд = 3 минуты
        let attempts = 0;

        const poll = async () => {
            attempts++;
            console.log(`🔁 Поллинг отчёта: попытка ${attempts}/${MAX_RETRIES}`);

            if (attempts > MAX_RETRIES) {
                this.setReportFailed();
                console.error('🛑 Таймаут ожидания отчёта');
                return;
            }

            try {
                const blob = await searchService.downloadReport(projectId);
                // Успешно получен → сохраняем и переходим в ready
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
                    // Продолжаем поллинг
                    setTimeout(poll, 1000);
                } else {
                    this.setReportFailed();
                    console.error('🚨 Ошибка при поллинге отчёта:', error);
                }
            }
        };

        poll();
    }

    setResult(data: any) {
        if (!this.drugName && data.inn_en) {
            this.drugName = data.inn_en;
        } else {
            this.drugName = this.drugName || 'Неизвестный препарат';
        }

        const newParameters = {
            cmax: null as number | null,
            auc: null as number | null,
            t_half: null as number | null,
            cv_intra: null as number | null,
        };

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

        const articles: Array<{
            id: string;
            authors: string;
            journal: string;
            params: Array<{ key: Parameter; value: string; unit: string }>;
            dataString: string;
        }> = [];

        const seenIds = new Map<string, typeof articles[number]>(); // Группировка по PMID

        data.parameters?.forEach((p: any, i: number) => {
            const key = p.parameter.toLowerCase();
            const value = p.value;
            const unit = p.unit || '';
            const mappedKey = paramKeyMap[key];

            if (mappedKey && !isNaN(parseFloat(value))) {
                if (newParameters[mappedKey] === null || p.is_reliable) {
                    newParameters[mappedKey] = parseFloat(value);
                }
            }

            const paramShort = key === 'cmax' ? 'Cmax' :
                key === 'auc' ? 'AUC' :
                    key === 't½' || key === 't1/2' || key === 't_half' ? 'T1/2' :
                        key === 'cv_intra' || key === 'cvintra' || key === 'cv' ? 'CVintra' : null;

            if (!paramShort) return;

            const pmidMatch = p.source?.match(/PMID[:\s]*(\d+)/i);
            const pmid = pmidMatch ? pmidMatch[1] : String(i + 1);
            const cleanSource = p.source ? p.source.replace(/\s*[,;]?\s*PMID[:\s]*\d+/i, '').trim() : 'Источник';

            if (!seenIds.has(pmid)) {
                seenIds.set(pmid, {
                    id: pmid,
                    authors: cleanSource,
                    journal: 'Клиническое исследование',
                    params: [],
                    dataString: '',
                });
            }

            const article = seenIds.get(pmid)!;
            article.params.push({
                key: paramShort as Parameter,
                value,
                unit,
            });
        });

        // Преобразуем Map в массив и формируем dataString
        this.articles = Array.from(seenIds.values()).map(article => ({
            ...article,
            dataString: article.params.map(p => `${p.key}: ${p.value} ${p.unit}`).join(', ')
        }));

        newParameters.cv_intra = newParameters.cv_intra ?? 25;
        this.parameters = newParameters;

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
        const MAX_RETRIES = 180;
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

    async calculateStudyDesign() {
        if (!this.project_id || this.designStatus === 'calculating') return;

        this.setDesignCalculating();

        try {
            const response = await searchService.calculateDesign({
                cv_intra: this.parameters.cv_intra ?? 25,
                t_half: this.parameters.t_half ?? undefined,
                power: this.power / 100,
                alpha: this.alpha,
                dropout_rate: this.dropoutRate,
                screen_fail_rate: this.screenFail,
                project_id: this.project_id,
                drug_name_t: this.testDrug || this.drugName,     // ← отправляем
                drug_name_r: this.referenceDrug || this.drugName, // ← отправляем
            });

            this.setDesignCompleted(response);
        } catch (error) {
            console.error('❌ Не удалось рассчитать дизайн:', error);
            this.setDesignFailed();
        }
    }

    // Метод для поллинга (если бэкенд использует асинхронный расчёт)
    async pollDesignResult(projectId: string, maxRetries = 60) {
        let attempts = 0;
        const poll = async (): Promise<DesignResult | null> => {
            attempts++;
            try {
                const result = await searchService.getDesignResult(projectId);
                this.setDesignCompleted(result);
                return result;
            } catch (error: any) {
                if (attempts < maxRetries) {
                    setTimeout(poll, 1000);
                } else {
                    this.setDesignFailed();
                }
                return null;
            }
        };
        return poll();
    }
}

export const searchStore = new SearchStore();