import React, { useState } from 'react';
import { Search, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { searchStore } from '../stores/drugStore.ts';
import { observer } from 'mobx-react-lite';

export default observer(function HomePage({ onSearch }: { onSearch: () => void }) {
  const [innEn, setInnEn] = useState('');
  const [dosage, setDosage] = useState(100);
  const [form, setForm] = useState('tablets');

  const handleStartSearch = () => {
    searchStore.startSearch(
        innEn,
        '', // пока пусто
        `${dosage}mg`,
        form
    );
    onSearch(); // Переход на ResultsPage
  };

  return (
      <div className="flex flex-col items-center max-w-5xl mx-auto mt-12 animate-in fade-in duration-500">
        <h1 className="text-5xl font-serif text-brand-blue mb-4 text-center leading-tight">
          Планирование исследования<br />биоэквивалентности
        </h1>
        <p className="text-slate-500 text-lg mb-12 text-center">
          Найдите референтный препарат и получите параметры дизайна
        </p>

        {/* Search Bar */}
        <div className="w-full relative mb-12 flex shadow-sm rounded-2xl bg-white p-2 border border-slate-200">
          <div className="flex-1 flex items-center px-4">
            <Search className="text-slate-400 mr-3" size={24} />
            <input
                type="text"
                placeholder="Введите МНН препарата (например, ибупрофен...)"
                value={innEn}
                onChange={(e) => setInnEn(e.target.value)}
                className="w-full h-14 text-lg outline-none bg-transparent"
            />
          </div>
          <button
              onClick={handleStartSearch}
              disabled={searchStore.status === 'searching'}
              className="bg-brand-green hover:bg-emerald-600 text-white px-10 rounded-xl font-medium text-lg transition-colors disabled:opacity-70"
          >
            {searchStore.status === 'searching' ? 'Поиск...' : 'Найти'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* File Upload */}
          <div className="flex flex-col">
            <h3 className="text-brand-blue font-medium mb-4 uppercase text-sm tracking-wider">Или загрузите файл с данными</h3>
            <div className="flex-1 border-2 border-dashed border-brand-blue/30 rounded-3xl bg-white flex flex-col items-center justify-center p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer min-h-[300px]">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-brand-blue">
                <Upload size={32} />
              </div>
              <p className="text-xl font-medium text-slate-900 mb-2">
                Перетащите файл сюда или{' '}
                <span className="text-brand-blue underline decoration-brand-blue/30 underline-offset-4">выберите вручную</span>
              </p>
              <p className="text-slate-500">
                Поддерживаются: XLSX, CSV, PDF, DOCX · до 50 МБ
              </p>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xl font-serif text-brand-blue mb-6">Расширенные фильтры</h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">Лекарственная форма</label>
                <div className="relative">
                  <select
                      value={form}
                      onChange={(e) => setForm(e.target.value)}
                      className="w-full appearance-none border border-slate-200 rounded-lg h-10 px-3 pr-8 text-slate-700 bg-white outline-none focus:border-brand-blue text-sm"
                  >
                    <option value="tablets">Таблетки</option>
                    <option value="capsules">Капсулы</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">Дозировка</label>
                <div className="flex border border-slate-200 rounded-lg h-10 overflow-hidden focus-within:border-brand-blue">
                  <input
                      type="number"
                      value={dosage}
                      onChange={(e) => setDosage(Number(e.target.value))}
                      className="w-full px-3 outline-none text-slate-700 text-center text-sm"
                  />
                  <div className="flex flex-col border-l border-slate-200 w-8 bg-slate-50">
                    <button
                        onClick={() => setDosage((d) => d + 10)}
                        className="flex-1 flex items-center justify-center hover:bg-slate-100 border-b border-slate-200"
                    >
                      <ChevronUp size={12} className="text-slate-500" />
                    </button>
                    <button
                        onClick={() => setDosage((d) => Math.max(0, d - 10))}
                        className="flex-1 flex items-center justify-center hover:bg-slate-100"
                    >
                      <ChevronDown size={12} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">Режим приёма</label>
                <div className="relative">
                  <select className="w-full appearance-none border border-slate-200 rounded-lg h-10 px-3 pr-8 text-slate-700 bg-white outline-none focus:border-brand-blue text-sm">
                    <option>Натощак</option>
                    <option>После еды</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <button className="w-full py-3 bg-transparent border-2 border-brand-blue text-brand-blue rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Применить фильтры
            </button>
          </div>
        </div>

        {/* Popular Drugs */}
        <div className="w-full mt-16 mb-8">
          <h3 className="text-2xl font-serif text-brand-blue mb-6">Популярные препараты</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DrugCard name="Парацетамол" cv="15%" design="2×2 кроссовер" desc="Низкая вариабельность, стандартный дизайн" />
            <DrugCard name="Амоксициллин" cv="22%" design="2×2 кроссовер" desc="Умеренная вариабельность, требуется контроль Tmax" />
            <DrugCard name="Эзомепразол" cv="45%" design="Репликативный" desc="Высоковариабельный препарат, масштабирование границ" />
          </div>
        </div>
      </div>
  );
});

function DrugCard({ name, cv, design, desc }: { name: string; cv: string; design: string; desc: string }) {
  return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
        <h4 className="text-xl font-bold text-slate-900 mb-4">{name}</h4>
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">CV intra</span>
            <span className="text-brand-green font-bold text-lg">{cv}</span>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">Дизайн</span>
            <span className="text-brand-blue font-medium">{design}</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
  );
}