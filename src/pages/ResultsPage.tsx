import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ChevronDown, Download, FileText } from 'lucide-react';
import { searchStore } from '../stores/drugStore';

type Parameter = 'Cmax' | 'AUC' | 'T1/2' | 'CVintra';

// --- Редактируемые компоненты ---
function EditableParamTile({
                             title,
                             value,
                             unit,
                             selected,
                             onChange,
                             onClick,
                           }: {
  title: string;
  value: string | number;
  unit: string;
  selected: boolean;
  onChange: (val: string) => void;
  onClick: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
  };

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
          {isEditing ? (
              <input
                  type="text"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                  className="text-3xl font-bold text-slate-900 w-20 outline-none border-b-2 border-brand-blue"
              />
          ) : (
              <span
                  className="text-3xl font-bold text-slate-900 hover:text-brand-blue transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
              >
            {localValue}
          </span>
          )}
          <span className="text-sm text-slate-500">{unit}</span>
        </div>
      </div>
  );
}

function EditableCalcTile({
                            title,
                            value,
                            unit,
                            onChange,
                          }: {
  title: string;
  value: string | number;
  unit: string;
  onChange: (val: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleSave = () => {
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      onChange(num);
    }
    setIsEditing(false);
  };

  return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
        <div className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider leading-tight h-8 flex items-center justify-center">
          {title}
        </div>
        <div className="flex items-baseline gap-1">
          {isEditing ? (
              <input
                  type="number"
                  step="any"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                  className="text-4xl font-bold text-slate-900 w-20 outline-none border-b-2 border-brand-blue"
              />
          ) : (
              <span
                  className="text-4xl font-bold text-slate-900 hover:text-brand-blue transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
              >
            {localValue}
          </span>
          )}
          {unit && <span className="text-lg text-slate-500 font-medium">{unit}</span>}
        </div>
      </div>
  );
}

export default observer(function ResultsPage({ onBack }: { onBack: () => void }) {
  const [selectedParams, setSelectedParams] = useState<Parameter[]>([]);
  const [dropoutRate, setDropoutRate] = useState(20);
  const [screenFail, setScreenFail] = useState(12);


  // Локальные состояния для редактируемых параметров
  const [cmax, setCmax] = useState<number | null>(searchStore.parameters.cmax);
  const [auc, setAuc] = useState<number | null>(searchStore.parameters.auc);
  const [tHalf, setTHalf] = useState<number | null>(searchStore.parameters.t_half);
  const [cvIntra, setCvIntra] = useState<number>(searchStore.parameters.cv_intra || 25);

  // Проверка, все ли обязательные параметры заполнены
  const areParamsComplete = cmax !== null && auc !== null && tHalf !== null && cvIntra !== null;

  const [delta, setDelta] = useState<number>(20);
  const [power, setPower] = useState<number>(80);
  const [alpha, setAlpha] = useState<number>(0.05);

  const [testDrug, setTestDrug] = useState(searchStore.testDrug);
  const [referenceDrug, setReferenceDrug] = useState(searchStore.referenceDrug);

  useEffect(() => {
    setCmax(searchStore.parameters.cmax);
    setAuc(searchStore.parameters.auc);
    setTHalf(searchStore.parameters.t_half);
    setCvIntra(searchStore.parameters.cv_intra || 25);

    if (!searchStore.testDrug) searchStore.setTestDrug(searchStore.drugName);
    if (!searchStore.referenceDrug) searchStore.setReferenceDrug(searchStore.drugName);

    setTestDrug(searchStore.testDrug);
    setReferenceDrug(searchStore.referenceDrug);
  }, [
    searchStore.parameters.cmax,
    searchStore.parameters.auc,
    searchStore.parameters.t_half,
    searchStore.parameters.cv_intra,
    searchStore.drugName,
    searchStore.testDrug,
    searchStore.referenceDrug,
  ]);

  const toggleParam = (param: Parameter) => {
    setSelectedParams((prev) =>
        prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param]
    );
  };

  const isArticleVisible = (article: any) => {
    if (selectedParams.length === 0) return true;
    return selectedParams.every((param) => article.params.includes(param));
  };

  const baseVolume = 30;
  const withDropout = Math.ceil(baseVolume / (1 - dropoutRate / 100));
  const withScreenFail = Math.ceil(withDropout / (1 - screenFail / 100));

  if (searchStore.status === 'idle' || searchStore.status === 'searching') {
    return (
        <div className="text-center py-20">
          <p className="text-xl text-slate-600">Ожидание результатов...</p>
        </div>
    );
  }

  if (searchStore.status === 'failed') {
    return (
        <div className="text-center py-20">
          <p className="text-xl text-red-600">Ошибка загрузки данных.</p>
        </div>
    );
  }

  // Текст кнопки отчёта
  const getReportButtonText = () => {
    if (searchStore.reportStatus === 'generating') return 'Генерация...';
    if (searchStore.reportStatus === 'ready') return 'Скачать отчёт';
    return 'Сгенерировать синопсис';
  };

  const handleReportClick = () => {
    if (searchStore.reportStatus === 'ready' && searchStore.reportBlob) {
      // Скачиваем
      const url = window.URL.createObjectURL(searchStore.reportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${searchStore.drugName}_synopsis.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else if (searchStore.reportStatus === 'idle' || searchStore.reportStatus === 'failed') {
      // Запускаем генерацию
      searchStore.generateReport();
    }
  };

  return (
      <div className="animate-in fade-in duration-500">

        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-serif text-brand-blue">
            Результаты поиска: {searchStore.drugName}
          </h1>
          <span className="bg-blue-100 text-brand-blue text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
        Готово
    </span>
        </div>

        <p className="text-slate-500 mt-2">
          Агрегированные данные из {searchStore.articles.length} источников · Обновлено сегодня
        </p>

        {/* Три колонки: Тестовый, Референтный, Дизайн — в ряд на больших экранах */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {/* Тестируемый препарат */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-1">Тестируемый препарат</label>
            <input
                type="text"
                value={testDrug}
                onChange={(e) => setTestDrug(e.target.value)}
                onBlur={() => searchStore.setTestDrug(testDrug)}
                onKeyDown={(e) => e.key === 'Enter' && searchStore.setTestDrug(testDrug)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Референтный препарат */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-1">Референтный препарат</label>
            <input
                type="text"
                value={referenceDrug}
                onChange={(e) => setReferenceDrug(e.target.value)}
                onBlur={() => searchStore.setReferenceDrug(referenceDrug)}
                onKeyDown={(e) => e.key === 'Enter' && searchStore.setReferenceDrug(referenceDrug)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Рекомендуемый дизайн */}
          <div className="mb-10">
            <section className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-md h-full flex flex-col justify-between">
              <div>
                <h2 className="text-green-800 font-medium text-sm uppercase tracking-wider mb-1">Рекомендуемый дизайн</h2>

                {searchStore.designStatus === 'completed' && searchStore.designResult ? (
                    <>
                      <h3 className="text-2xl font-serif text-green-900 mb-3">
                        {searchStore.designResult.design_type}
                      </h3>
                      <p className="text-green-700 text-sm leading-relaxed mb-4">
                        {searchStore.designResult.design_explanation}
                      </p>
                      <div className="text-xs text-green-800 space-y-1">
                        <div><strong>Период вымывания:</strong> {searchStore.designResult.washout_days} дней</div>
                        <div><strong>Объём набора:</strong> {searchStore.designResult.recruitment_size} участников</div>
                      </div>
                    </>
                ) : searchStore.designStatus === 'calculating' ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-green-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-green-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-green-200 rounded w-5/6"></div>
                    </div>
                ) : (
                    <div>
                      <h3 className="text-2xl font-serif text-green-900 mb-3">Ожидание расчёта...</h3>
                      <p className="text-green-700 text-sm">
                        Нажмите кнопку «Рассчитать дизайн исследования», чтобы получить рекомендации.
                      </p>
                    </div>
                )}
              </div>

            </section>
          </div>

        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="text-brand-blue font-medium text-lg mb-4">Фармакокинетические параметры</h2>
              <div className="grid grid-cols-2 gap-4">
                <EditableParamTile
                    title="C MAX"
                    value={cmax?.toFixed(1) || '-'}
                    unit="нг/мл"
                    selected={selectedParams.includes('Cmax')}
                    onChange={(val) => {
                      const parsed = parseFloat(val);
                      setCmax(isNaN(parsed) ? null : parsed);
                      searchStore.setParam('cmax', isNaN(parsed) ? null : parsed);
                    }}
                    onClick={() => toggleParam('Cmax')}
                />
                <EditableParamTile
                    title="AUC"
                    value={auc?.toFixed(1) || '-'}
                    unit="нг·ч/мл"
                    selected={selectedParams.includes('AUC')}
                    onChange={(val) => {
                      const parsed = parseFloat(val);
                      setAuc(isNaN(parsed) ? null : parsed);
                      searchStore.setParam('auc', isNaN(parsed) ? null : parsed);
                    }}
                    onClick={() => toggleParam('AUC')}
                />
                <EditableParamTile
                    title="T½"
                    value={tHalf?.toFixed(1) || '-'}
                    unit="часов"
                    selected={selectedParams.includes('T1/2')}
                    onChange={(val) => {
                      const parsed = parseFloat(val);
                      setTHalf(isNaN(parsed) ? null : parsed);
                      searchStore.setParam('t_half', isNaN(parsed) ? null : parsed);
                    }}
                    onClick={() => toggleParam('T1/2')}
                />
                <EditableParamTile
                    title="CV INTRA"
                    value={`${cvIntra}`}
                    unit="%"
                    selected={selectedParams.includes('CVintra')}
                    onChange={(val) => {
                      const parsed = parseFloat(val);
                      const value = isNaN(parsed) ? 25 : parsed;
                      setCvIntra(value);
                      searchStore.setParam('cv_intra', value);
                    }}
                    onClick={() => toggleParam('CVintra')}
                />
              </div>
              <p className="text-slate-500 text-xs mt-3 text-center">
                Нажмите на параметр, чтобы отфильтровать источники
              </p>
            </section>

          </div>


          {/* CENTRAL COLUMN */}
          <div className="flex flex-col gap-8">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-brand-blue font-serif text-xl mb-6 text-center">Калькулятор объема выборки</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <EditableCalcTile title="ОЖИДАЕМАЯ РАЗНИЦА (Δ)" value={delta} unit="%" onChange={setDelta} />
                <EditableCalcTile title="МОЩНОСТЬ (1-β)" value={power} unit="%" onChange={setPower} />
                <EditableCalcTile title="УРОВЕНЬ ЗНАЧИМОСТИ (α)" value={alpha} unit="" onChange={setAlpha} />
                <EditableCalcTile
                    title="ВНУТРИСУБЪЕКТНЫЙ CV"
                    value={cvIntra}
                    unit="%"
                    onChange={(val) => {
                      setCvIntra(val);
                      searchStore.setParam('cv_intra', val);
                    }}
                />
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
                      type="range"
                      min="0"
                      max="50"
                      value={dropoutRate}
                      onChange={(e) => setDropoutRate(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium text-brand-blue mb-2 uppercase tracking-wider">
                    <span>Screen fail</span>
                    <span>{screenFail}%</span>
                  </div>
                  <input
                      type="range"
                      min="0"
                      max="50"
                      value={screenFail}
                      onChange={(e) => setScreenFail(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                  />
                </div>
              </div>
              {/* Кнопка "Рассчитать дизайн" */}
              <div className="mt-6">
                <button
                    onClick={() => searchStore.calculateStudyDesign()}
                    disabled={searchStore.designStatus === 'calculating' || !areParamsComplete}
                    className={`w-full h-12 font-medium rounded-lg transition-colors ${
                        areParamsComplete && searchStore.designStatus !== 'calculating'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={!areParamsComplete ? 'Заполните все фармакокинетические параметры' : ''}
                >
                  {!areParamsComplete
                      ? 'Заполните параметры'
                      : searchStore.designStatus === 'calculating'
                          ? 'Расчёт...'
                          : 'Рассчитать дизайн исследования'}
                </button>
              </div>
            </section>

            {/* Схема рандомизации */}
            <section>
              <h2 className="text-brand-blue font-medium text-lg mb-4">Схема рандомизации</h2>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center mb-4 bg-slate-50">
                  {searchStore.designStatus === 'completed' && searchStore.designResult ? (
                      <span className="text-slate-600 text-sm">
          Последовательность: <strong className="text-slate-900">
            {searchStore.designResult.randomization_scheme || 'A/b · B/A'}
          </strong>
        </span>
                  ) : (
                      <span className="text-slate-600 text-sm">
          Последовательность: <strong className="text-slate-900">A/B · b/A</strong>
        </span>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN */}

          <div className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-brand-blue font-medium text-lg">Все статьи</h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
              {searchStore.articles.length} статей
            </span>
            </div>

            <div className="flex-1 flex flex-col gap-3 mb-6 overflow-y-auto pr-2" style={{ maxHeight: '800px' }}>
              {(() => {
                const grouped = searchStore.articles.reduce((map, article) => {
                  if (!map.has(article.id)) {
                    map.set(article.id, { ...article, params: new Set(article.params), count: 1 });
                  } else {
                    const existing = map.get(article.id)!;
                    article.params.forEach(p => existing.params.add(p));
                    existing.count += 1;
                  }
                  return map;
                }, new Map<string, any>());

                return Array.from(grouped.values()).map((article, index) => {
                  const visible = selectedParams.length === 0 ||
                      selectedParams.every(param => article.params.has(param));

                  return (
                      <a
                          key={article.id}
                          href={`https://pubmed.ncbi.nlm.nih.gov/${article.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block transition-all duration-300 ${
                              visible
                                  ? selectedParams.length > 0
                                      ? 'border-blue-200 shadow-sm'
                                      : 'border-slate-200 shadow-sm'
                                  : 'opacity-40 border-slate-100 grayscale-[50%]'
                          }`}
                      >
                        <div className="bg-white rounded-xl p-4 border cursor-pointer hover:shadow-md">
                          <div className="flex justify-between items-start mb-1">
                            <div>
    <span className="inline-block bg-gray-200 text-gray-800 text-xs font-bold px-2 py-1 rounded mr-2">
      №{index + 1}
    </span>
                              <h4 className="font-bold text-slate-900 inline">{article.authors}</h4>
                            </div>
                            <span className="text-xs text-slate-500 self-center">PMID: {article.id}</span>
                          </div>
                          <p className="text-slate-500 text-sm italic mb-3">{article.journal}</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(article.params).map((p: Parameter) => (
                                <span
                                    key={p}
                                    className={`text-xs px-2 py-1 rounded border ${
                                        selectedParams.includes(p)
                                            ? 'bg-blue-50 border-blue-200 text-brand-blue font-medium'
                                            : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}
                                >
                  {p}
                </span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                            Найдено значений: {article.count}
                          </p>
                        </div>
                      </a>
                  );
                });
              })()}
            </div>

            <div className="mt-auto pt-4">
              <p className="text-slate-500 text-xs text-right mb-2">
                На основе данных из {searchStore.articles.length} источников
              </p>

              {/* Единая кнопка для генерации и скачивания */}
              <button
                  onClick={handleReportClick}
                  disabled={searchStore.reportStatus === 'generating'}
                  className={`w-full h-16 font-bold text-lg tracking-wide shadow-[0_4px_10px_rgba(30,58,138,0.2)] transition-all flex items-center justify-center gap-3 uppercase
                ${
                      searchStore.reportStatus === 'ready'
                          ? 'bg-brand-green hover:bg-emerald-600 text-white'
                          : 'bg-brand-blue hover:bg-[#153E75] text-white'
                  }
                ${searchStore.reportStatus === 'generating' ? 'opacity-70 cursor-not-allowed' : ''}
              `}
              >
                {searchStore.reportStatus === 'ready' ? (
                    <Download size={24} />
                ) : (
                    <FileText size={24} />
                )}
                {getReportButtonText()}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
});