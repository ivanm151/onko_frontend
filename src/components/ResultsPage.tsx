import React, { useState } from 'react';
import { ChevronDown, Download, FileText } from 'lucide-react';

type Parameter = 'Cmax' | 'AUC' | 'T1/2' | 'CVintra';

interface Article {
  id: string;
  authors: string;
  journal: string;
  params: Parameter[];
  dataString: string;
}

const ARTICLES: Article[] = [
  { id: '1', authors: 'Smith J. et al., 2018', journal: 'Int J Clin Pharmacol Ther.', params: ['Cmax', 'AUC', 'CVintra'], dataString: 'Cmax 44.9 · AUC 120.5 · CV 24%' },
  { id: '2', authors: 'Davies N.M., 1998', journal: 'Clin Pharmacokinet.', params: ['Cmax', 'T1/2'], dataString: 'Cmax 43.8 · T½ 2.0' },
  { id: '3', authors: 'Hinz B. et al., 2020', journal: 'Br J Clin Pharmacol.', params: ['AUC', 'T1/2', 'CVintra'], dataString: 'AUC 118.2 · T½ 2.3 · CV 26%' },
  { id: '4', authors: 'Vree T.B. et al., 1993', journal: 'J Chromatogr B.', params: ['Cmax', 'AUC'], dataString: 'Cmax 46.2 · AUC 122.1' },
  { id: '5', authors: 'Gonzalez I. et al., 2015', journal: 'Eur J Pharm Sci.', params: ['CVintra', 'T1/2'], dataString: 'CV 23% · T½ 1.9' },
  { id: '6', authors: 'Rainsford K.D., 2009', journal: 'Inflammopharmacology.', params: ['Cmax', 'AUC', 'CVintra'], dataString: 'Cmax 45.1 · AUC 119.8 · CV 25%' },
];

export default function ResultsPage({ onBack }: { onBack: () => void }) {
  const [selectedParams, setSelectedParams] = useState<Parameter[]>([]);
  const [dropoutRate, setDropoutRate] = useState(20);
  const [screenFail, setScreenFail] = useState(12);

  const toggleParam = (param: Parameter) => {
    setSelectedParams(prev => 
      prev.includes(param) ? prev.filter(p => p !== param) : [...prev, param]
    );
  };

  const isArticleVisible = (article: Article) => {
    if (selectedParams.length === 0) return true;
    return selectedParams.every(param => article.params.includes(param));
  };

  // Base calculation logic (mocked for UI purposes)
  const baseVolume = 30;
  const withDropout = Math.ceil(baseVolume / (1 - dropoutRate / 100));
  const withScreenFail = Math.ceil(withDropout / (1 - screenFail / 100));

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <button onClick={onBack} className="text-brand-blue hover:underline mb-4 text-sm font-medium">
          &larr; Назад к поиску
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-serif text-brand-blue">Результаты поиска: Ибупрофен</h1>
          <span className="bg-blue-100 text-brand-blue text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Готово</span>
        </div>
        <p className="text-slate-500 mt-2">Агрегированные данные из 6 источников · Обновлено сегодня</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-8">
          
          {/* Фармакокинетические параметры */}
          <section>
            <h2 className="text-brand-blue font-medium text-lg mb-4">Фармакокинетические параметры</h2>
            <div className="grid grid-cols-2 gap-4">
              <ParamTile 
                title="C MAX" value="44.9" unit="нг/мл" 
                selected={selectedParams.includes('Cmax')} 
                onClick={() => toggleParam('Cmax')} 
              />
              <ParamTile 
                title="AUC" value="120.5" unit="нг·ч/мл" 
                selected={selectedParams.includes('AUC')} 
                onClick={() => toggleParam('AUC')} 
              />
              <ParamTile 
                title="T½" value="2.1" unit="часов" 
                selected={selectedParams.includes('T1/2')} 
                onClick={() => toggleParam('T1/2')} 
              />
              <ParamTile 
                title="CV INTRA" value="25%" unit="внутрисубъект." 
                selected={selectedParams.includes('CVintra')} 
                onClick={() => toggleParam('CVintra')} 
              />
            </div>
            <p className="text-slate-500 text-xs mt-3 text-center">Нажмите на параметр, чтобы отфильтровать источники</p>
          </section>

          {/* Дополнительные параметры препарата */}
          <section>
            <h2 className="text-brand-blue font-medium text-lg mb-4">Дополнительные параметры препарата</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Биодоступность</span>
                <span className="font-medium text-slate-900">85–95%</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Связь с белками</span>
                <span className="font-medium text-slate-900">99%</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Метаболиты</span>
                <span className="font-medium text-slate-900">активные</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Период полувыведения</span>
                <span className="font-medium text-slate-900">2–4 ч</span>
              </div>
            </div>
          </section>
        </div>

        {/* CENTRAL COLUMN */}
        <div className="flex flex-col gap-8">
          
          {/* Калькулятор объема выборки */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-brand-blue font-serif text-xl mb-6 text-center">Калькулятор объема выборки</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <CalcTile title="ОЖИДАЕМАЯ РАЗНИЦА (Δ)" value="20" unit="%" />
              <CalcTile title="МОЩНОСТЬ (1-β)" value="80" unit="%" />
              <CalcTile title="УРОВЕНЬ ЗНАЧИМОСТИ (α)" value="0.05" unit="" />
              <CalcTile title="ВНУТРИСУБЪЕКТНЫЙ CV" value="25" unit="%" />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600 text-sm">Базовый объем:</span>
                <span className="font-bold text-slate-900">{baseVolume} чел</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600 text-sm">С учетом dropout ({dropoutRate}%):</span>
                <span className="font-bold text-slate-900">{withDropout} чел</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 text-sm">С учетом screen fail ({screenFail}%):</span>
                <span className="font-bold text-brand-blue">{withScreenFail} чел</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium text-brand-blue mb-2 uppercase tracking-wider">
                  <span>Dropout rate</span>
                  <span>{dropoutRate}%</span>
                </div>
                <input 
                  type="range" min="0" max="50" value={dropoutRate} onChange={(e) => setDropoutRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium text-brand-blue mb-2 uppercase tracking-wider">
                  <span>Screen fail</span>
                  <span>{screenFail}%</span>
                </div>
                <input 
                  type="range" min="0" max="50" value={screenFail} onChange={(e) => setScreenFail(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
            </div>
          </section>

          {/* Рекомендуемый дизайн */}
          <section>
            <h2 className="text-brand-blue font-medium text-lg mb-4">Рекомендуемый дизайн</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-2xl font-serif text-brand-blue mb-3">2×2 кроссовер</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Низкая вариабельность (CV &lt; 30%) позволяет использовать классический двухпериодный кроссовер. Рекомендован EMA Guideline on the Investigation of Bioequivalence (2010).
              </p>
              <button className="text-brand-blue font-medium text-sm hover:underline flex items-center gap-1">
                Подробнее о дизайне &rarr;
              </button>
            </div>
          </section>

          {/* Схема рандомизации */}
          <section>
            <h2 className="text-brand-blue font-medium text-lg mb-4">Схема рандомизации</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center mb-4 bg-slate-50">
                <span className="text-slate-600 text-sm">Последовательность: <strong className="text-slate-900">A/B · B/A</strong></span>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-2.5 border-2 border-brand-blue text-brand-blue rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm">
                  Сгенерировать схему
                </button>
                <button className="flex-1 py-2.5 bg-brand-green text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Download size={16} /> Скачать
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col h-full">
          
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-brand-blue font-medium text-lg">Все источники</h2>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{ARTICLES.length} статей</span>
          </div>

          <div className="flex-1 flex flex-col gap-3 mb-6 overflow-y-auto pr-2" style={{ maxHeight: '800px' }}>
            {ARTICLES.map((article) => {
              const visible = isArticleVisible(article);
              return (
                <div 
                  key={article.id} 
                  className={`bg-white rounded-xl p-4 border transition-all duration-300 cursor-pointer hover:shadow-md ${
                    visible 
                      ? selectedParams.length > 0 ? 'border-blue-200 shadow-sm' : 'border-slate-200 shadow-sm'
                      : 'opacity-40 border-slate-100 grayscale-[50%]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900">{article.authors}</h4>
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm italic mb-3">{article.journal}</p>
                  <div className="flex flex-wrap gap-2">
                    {article.params.map(p => (
                      <span key={p} className={`text-xs px-2 py-1 rounded border ${
                        selectedParams.includes(p) ? 'bg-blue-50 border-blue-200 text-brand-blue font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    {article.dataString}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4">
            <p className="text-slate-500 text-xs text-right mb-2">На основе данных из {ARTICLES.length} источников</p>
            <button className="w-full h-16 bg-brand-blue hover:bg-[#153E75] text-white rounded-2xl font-bold text-lg tracking-wide shadow-[0_4px_10px_rgba(30,58,138,0.2)] transition-all flex items-center justify-center gap-3 uppercase">
              <FileText size={24} />
              Сгенерировать синопсис
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

function ParamTile({ title, value, unit, selected, onClick }: { title: string, value: string, unit: string, selected: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
        selected 
          ? 'border-2 border-brand-blue shadow-md bg-blue-50/30' 
          : 'border border-slate-200 shadow-sm hover:border-brand-blue/50 hover:shadow-md'
      }`}
    >
      <div className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function CalcTile({ title, value, unit }: { title: string, value: string, unit: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
      <div className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider leading-tight h-8 flex items-center justify-center">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-lg text-slate-500 font-medium">{unit}</span>}
      </div>
    </div>
  );
}
