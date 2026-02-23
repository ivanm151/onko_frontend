import { searchService } from '../services/drugService';
import { makeAutoObservable } from 'mobx';

type Parameter = 'Cmax' | 'AUC' | 'T1/2' | 'CVintra';

export class SearchStore {
    project_id: string | null = null;
    status: 'idle' | 'searching' | 'completed' | 'failed' = 'idle';
    drugName: string = ''; // ← изначальное найденное название (референт)
    testDrug: string = ''; // ← тестируемый препарат
    referenceDrug: string = ''; // ← референтный препарат

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
    excipientMatch: number = 50;

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

    setResult(result: any) {
        this.drugName = result.drugName;
        this.parameters = result.parameters;
        this.articles = result.articles.map((article: any) => ({
            ...article,
            params: article.params as Parameter[],
        }));
        // Устанавливаем значения по умолчанию: референт = найденный препарат
        if (!this.referenceDrug) this.referenceDrug = this.drugName;
        if (!this.testDrug) this.testDrug = this.drugName;
    }

    async startSearch(
        inn_en: string,
        inn_ru: string,
        dosage: string,
        form: string,
        excipients: string[] = [],
        excipientMatch: number = 50
    ) {
        this.setSearching();
        this.excipients = excipients;
        this.excipientMatch = excipientMatch;

        try {
            const response = await searchService.startSearch({
                inn_en,
                inn_ru,
                dosage,
                form,
                excipients,
                excipient_match: excipientMatch,
            });
            this.setProjectId(response.project_id);
            this.pollStatus(response.project_id);
        } catch (error) {
            this.setFailed();
            console.error('Start search failed:', error);
        }
    }

    async pollStatus(projectId: string) {
        const poll = async () => {
            try {
                const response = await searchService.getProjectStatus(projectId);
                if (response.status === 'COMPLETED') {
                    this.setResult(response.result);
                    this.setCompleted();
                } else {
                    setTimeout(poll, 1000);
                }
            } catch (error) {
                this.setFailed();
                console.error('Polling failed:', error);
            }
        };
        poll();
    }

    setParam(key: 'cmax' | 'auc' | 't_half' | 'cv_intra', value: number | null) {
        this.parameters[key] = value;
    }

    // Методы для изменения препаратов
    setTestDrug(name: string) {
        this.testDrug = name;
    }

    setReferenceDrug(name: string) {
        this.referenceDrug = name;
    }
}

export const searchStore = new SearchStore();