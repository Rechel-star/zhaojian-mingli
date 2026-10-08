/* global Solar, iztro, lucide */

const $ = (selector) => document.querySelector(selector);
const ELEMENT = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const BRANCH_ELEMENT = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
const CITY_LONGITUDE = { "遵义": 106.93, "贵州省遵义市": 106.93, "北京": 116.4, "上海": 121.47, "广州": 113.27, "深圳": 114.06, "成都": 104.07, "重庆": 106.55 };
const MONTH_NAMES = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];

const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  chart: null,
  ziweiChart: null,
  selectedPalaceIndex: 0,
  activeDaYun: 0,
  aiConfigured: false,
  aiLoading: false,
  interpretationScope: "natal"
};

const SCOPE_COPY = {
  natal: {
    label: "本命全盘",
    description: "只分析四柱、十神与命局结构，不带入任何大运、流年或流月。",
    placeholder: "例如：这张命盘的核心性格、优势和容易卡住的地方是什么？"
  },
  dayun: {
    label: "当前大运",
    description: "在本命结构上叠加当前十年大运，观察这个阶段的长期主题。",
    placeholder: "例如：这步大运的主要课题是什么，适合把精力放在哪里？"
  },
  year: {
    label: "所选流年",
    description: "结合本命、当前大运与所选年份，不带入具体月份。",
    placeholder: "例如：这一年的整体节奏和需要留意的主题是什么？"
  },
  month: {
    label: "所选流月",
    description: "结合本命、大运、流年与所选月份，观察较短周期的倾向。",
    placeholder: "例如：这个月更适合推进新项目，还是整理已有计划？"
  }
};

function equationOfTime(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
  const b = (2 * Math.PI * (day - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function getLongitude(place) {
  const match = Object.entries(CITY_LONGITUDE).find(([name]) => place.includes(name));
  return match ? match[1] : 120;
}

function correctedTime(date, place, useSolar) {
  if (!useSolar) return { date, offset: 0 };
  const longitude = getLongitude(place);
  const offset = (longitude - 120) * 4 + equationOfTime(date);
  return { date: new Date(date.getTime() + offset * 60000), offset };
}

function parseBirthForm() {
  const [year, month, day] = $("#birthDate").value.split("-").map(Number);
  const [hour, minute] = $("#birthTime").value.split(":").map(Number);
  const place = $("#birthPlace").value.trim();
  const gender = Number(document.querySelector('input[name="gender"]:checked').value);
  const useSolar = document.querySelector('input[name="timeMode"]:checked').value === "solar";
  const clockDate = new Date(year, month - 1, day, hour, minute, 0);
  const corrected = correctedTime(clockDate, place, useSolar);
  return { name: $("#name").value.trim() || "未署名", place, gender, useSolar, clockDate, ...corrected };
}

function makeChart(form) {
  const d = form.date;
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0);
  const lunar = solar.getLunar();
  const eight = lunar.getEightChar();
  eight.setSect(2);
  const yun = eight.getYun(form.gender, 2);
  const pillars = [
    { label: "年柱", gz: eight.getYear(), relation: eight.getYearShiShenGan(), hidden: eight.getYearHideGan(), hiddenRelation: eight.getYearShiShenZhi(), nayin: eight.getYearNaYin() },
    { label: "月柱", gz: eight.getMonth(), relation: eight.getMonthShiShenGan(), hidden: eight.getMonthHideGan(), hiddenRelation: eight.getMonthShiShenZhi(), nayin: eight.getMonthNaYin() },
    { label: "日柱", gz: eight.getDay(), relation: "日主", hidden: eight.getDayHideGan(), hiddenRelation: eight.getDayShiShenZhi(), nayin: eight.getDayNaYin() },
    { label: "时柱", gz: eight.getTime(), relation: eight.getTimeShiShenGan(), hidden: eight.getTimeHideGan(), hiddenRelation: eight.getTimeShiShenZhi(), nayin: eight.getTimeNaYin() }
  ];
  return { form, solar, lunar, eight, yun, pillars };
}

function getTimeIndex(date) {
  const hour = date.getHours();
  return hour === 23 ? 0 : Math.floor((hour + 1) / 2);
}

function makeZiweiChart(form) {
  const d = form.date;
  const solarDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const gender = form.gender === 0 ? "女" : "男";
  return iztro.astro.bySolar(solarDate, getTimeIndex(d), gender, true, "zh-CN");
}

function starMarkup(star, prominent = false) {
  const mutagen = star.mutagen ? `<b class="mutagen ${star.mutagen === "禄" ? "lu" : star.mutagen === "权" ? "quan" : star.mutagen === "科" ? "ke" : "ji"}">${star.mutagen}</b>` : "";
  const brightness = star.brightness ? `<small>${star.brightness}</small>` : "";
  return `<span class="star ${prominent ? "major-star" : ""}">${star.name}${brightness}${mutagen}</span>`;
}

function renderZiweiChart() {
  const chart = state.ziweiChart;
  if (!chart) return;
  const position = {
    巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
    辰: [2, 1], 酉: [2, 4],
    卯: [3, 1], 戌: [3, 4],
    寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4]
  };
  $("#ziweiProfileName").textContent = state.chart.form.name;
  $("#ziweiDate").textContent = `${chart.lunarDate} · ${chart.timeRange} · ${chart.gender}`;

  const center = `
    <div class="ziwei-center">
      <span class="ziwei-center-mark">紫</span>
      <strong>${chart.fiveElementsClass}</strong>
      <p>命主 ${chart.soul} · 身主 ${chart.body}</p>
      <div><span>命宫 ${chart.earthlyBranchOfSoulPalace}</span><span>身宫 ${chart.earthlyBranchOfBodyPalace}</span></div>
      <small>${chart.chineseDate}</small>
    </div>
  `;
  const palaces = chart.palaces.map((palace) => {
    const [row, column] = position[palace.earthlyBranch];
    const classes = [
      "ziwei-palace",
      palace.name === "命宫" ? "soul-palace" : "",
      palace.isBodyPalace ? "body-palace" : "",
      palace.index === state.selectedPalaceIndex ? "selected" : ""
    ].filter(Boolean).join(" ");
    const major = palace.majorStars.length
      ? palace.majorStars.map((star) => starMarkup(star, true)).join("")
      : '<span class="empty-star">空宫</span>';
    const minor = palace.minorStars.slice(0, 4).map((star) => starMarkup(star)).join("");
    return `
      <button class="${classes}" data-palace-index="${palace.index}" style="grid-row:${row};grid-column:${column}">
        <span class="palace-top"><b>${palace.name}</b><small>${palace.heavenlyStem}${palace.earthlyBranch}</small></span>
        <span class="palace-stars">${major}</span>
        <span class="palace-minor">${minor}</span>
        <span class="palace-bottom">
          <small>${palace.decadal.range[0]}—${palace.decadal.range[1]}</small>
          ${palace.isBodyPalace ? "<b>身</b>" : ""}
        </span>
      </button>
    `;
  }).join("");
  $("#ziweiBoard").innerHTML = center + palaces;
  document.querySelectorAll("[data-palace-index]").forEach((button) => {
    button.addEventListener("click", () => selectZiweiPalace(Number(button.dataset.palaceIndex)));
  });
  renderPalaceDetail();
  lucide.createIcons();
}

function selectZiweiPalace(index) {
  state.selectedPalaceIndex = index;
  $("#ziweiAiOutput").hidden = true;
  renderZiweiChart();
}

function renderPalaceDetail() {
  const palace = state.ziweiChart.palaces.find((item) => item.index === state.selectedPalaceIndex);
  if (!palace) return;
  $("#palaceDetailTitle").textContent = `${palace.name} · ${palace.heavenlyStem}${palace.earthlyBranch}${palace.isBodyPalace ? " · 身宫" : ""}`;
  $("#palaceDecadal").textContent = `大限 ${palace.decadal.range[0]}—${palace.decadal.range[1]} 岁`;
  $("#palaceMajorStars").innerHTML = palace.majorStars.length
    ? palace.majorStars.map((star) => starMarkup(star, true)).join("")
    : '<span class="empty-star">本宫无十四主星，需结合对宫与三方四正观察</span>';
  $("#palaceMinorStars").innerHTML = palace.minorStars.length
    ? palace.minorStars.map((star) => starMarkup(star)).join("")
    : '<span class="empty-star">无主要辅煞星</span>';
  const adjective = palace.adjectiveStars.map((star) => star.name).join("、") || "无";
  $("#palaceAdjectiveStars").textContent = `${adjective} · 十二长生：${palace.changsheng12}`;
}

function renderChart() {
  const { form, lunar, eight, yun, pillars } = state.chart;
  $("#profileName").textContent = form.name;
  $("#lunarDate").textContent = `${lunar.toString()} · ${eight.getTimeZhi()}时`;
  const roundedOffset = Math.round(form.offset);
  const correctedLabel = `${String(form.date.getHours()).padStart(2, "0")}:${String(form.date.getMinutes()).padStart(2, "0")}`;
  $("#timeNote").textContent = form.useSolar
    ? `经度与均时差校正约 ${roundedOffset} 分钟，真太阳时约 ${correctedLabel}，为${eight.getTimeZhi()}时。`
    : `当前使用北京时间；切换真太阳时可检查时辰边界。`;

  $("#pillars").innerHTML = pillars.map((p, index) => `
    <article class="pillar ${index === 2 ? "day" : ""}" data-element="${ELEMENT[p.gz[0]]}">
      <span class="relation"><small>天干十神</small><strong>${p.relation}</strong></span>
      <span class="stem">${p.gz[0]}</span>
      <span class="branch">${p.gz[1]}</span>
      <div class="hidden-relations">
        <span>藏干十神</span>
        ${p.hidden.map((gan, hiddenIndex) => `
          <strong><b>${gan}</b>${p.hiddenRelation[hiddenIndex]}</strong>
        `).join("")}
      </div>
    </article>
  `).join("");

  $("#chartFoot").innerHTML = `
    <span>日主 <strong>${eight.getDayGan()}${ELEMENT[eight.getDayGan()]}</strong></span>
    <span>命宫 <strong>${eight.getMingGong()}</strong></span>
    <span>身宫 <strong>${eight.getShenGong()}</strong></span>
    <span>胎元 <strong>${eight.getTaiYuan()}</strong></span>
    <span>旬空 <strong>${eight.getDayXunKong()}</strong></span>
  `;

  $("#startAge").textContent = `${yun.isForward() ? "顺排" : "逆排"} · ${yun.getStartYear()} 岁 ${yun.getStartMonth()} 个月起运`;
  renderDaYun();
  renderYear();
  state.ziweiChart = makeZiweiChart(form);
  const soulPalace = state.ziweiChart.palaces.find((palace) => palace.name === "命宫");
  state.selectedPalaceIndex = soulPalace ? soulPalace.index : 0;
  renderZiweiChart();
  clearAiOutput();
}

function renderDaYun() {
  const dayun = state.chart.yun.getDaYun(9).slice(1);
  const dayGan = state.chart.eight.getDayGan();
  const currentIndex = Math.max(0, dayun.findIndex((item) => state.year >= item.getStartYear() && state.year <= item.getEndYear()));
  state.activeDaYun = currentIndex;
  const currentDaYun = dayun[currentIndex];
  $("#dayunScopeLabel").textContent = currentDaYun
    ? `${currentDaYun.getGanZhi()} · ${currentDaYun.getStartYear()}—${currentDaYun.getEndYear()}`
    : "十年阶段主题";
  $("#dayunTrack").innerHTML = dayun.map((item, index) => `
    <button class="dayun-item ${index === currentIndex ? "active" : ""}" data-dayun="${index}">
      <span>${item.getStartAge()}—${item.getEndAge()} 岁</span>
      <strong>${item.getGanZhi()}</strong>
      <em>${relationToDayMaster(dayGan, item.getGanZhi()[0])}</em>
      <small>${item.getStartYear()}—${item.getEndYear()}</small>
    </button>
  `).join("");
  document.querySelectorAll("[data-dayun]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = dayun[Number(button.dataset.dayun)];
      state.year = target.getStartYear();
      if (state.interpretationScope !== "natal") clearAiOutput();
      renderDaYun();
      renderYear();
    });
  });
}

function relationToDayMaster(dayGan, otherGan) {
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const cycle = ["木", "火", "土", "金", "水"];
  const dayElement = ELEMENT[dayGan];
  const otherElement = ELEMENT[otherGan];
  const samePolarity = stems.indexOf(dayGan) % 2 === stems.indexOf(otherGan) % 2;
  if (dayElement === otherElement) return samePolarity ? "比肩" : "劫财";
  const dayIndex = cycle.indexOf(dayElement);
  const otherIndex = cycle.indexOf(otherElement);
  if ((dayIndex + 1) % 5 === otherIndex) return samePolarity ? "食神" : "伤官";
  if ((otherIndex + 1) % 5 === dayIndex) return samePolarity ? "偏印" : "正印";
  if ((dayIndex + 2) % 5 === otherIndex) return samePolarity ? "偏财" : "正财";
  return samePolarity ? "七杀" : "正官";
}

function renderYear() {
  $("#selectedYear").textContent = state.year;
  const yearLunar = Solar.fromYmd(state.year, 7, 1).getLunar();
  const yearGz = yearLunar.getYearInGanZhiExact();
  const monthLunar = Solar.fromYmd(state.year, state.month + 1, 15).getLunar();
  const monthGz = monthLunar.getMonthInGanZhiExact();
  const dayGan = state.chart.eight.getDayGan();
  const dayBranch = state.chart.eight.getDayZhi();
  const yearRelation = relationToDayMaster(dayGan, yearGz[0]);
  const monthRelation = relationToDayMaster(dayGan, monthGz[0]);

  $("#yearGanZhi").textContent = yearGz;
  $("#yearRelation").textContent = `流年 · ${yearRelation}`;
  $("#yearContext").textContent = `${yearGz}流年天干为${yearRelation}；当前 ${monthGz} 月，月干为${monthRelation}。`;
  $("#readingTitle").textContent = `${state.year} 年 ${state.month + 1} 月`;
  $("#yearScopeLabel").textContent = `${state.year} 年 · ${yearGz}`;
  $("#monthScopeLabel").textContent = `${state.year} 年 ${state.month + 1} 月 · ${monthGz}`;

  $("#monthStrip").innerHTML = Array.from({ length: 12 }, (_, index) => {
    const lunar = Solar.fromYmd(state.year, index + 1, 15).getLunar();
    return `<button class="month-btn ${index === state.month ? "active" : ""}" data-month="${index}">
      <span>${index + 1}月</span><small>${lunar.getMonthInGanZhiExact()}</small>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-month]").forEach((button) => {
    button.addEventListener("click", () => {
      state.month = Number(button.dataset.month);
      if (state.interpretationScope === "month") clearAiOutput();
      renderYear();
    });
  });

  const branchRelation = yearGz[1] === dayBranch
    ? `流年地支与日支同为${dayBranch}，属于伏吟关系，适合留意重复出现的议题。`
    : `流年地支${yearGz[1]}与日支${dayBranch}不同，具体合冲刑害将在规则库完善后逐项标注。`;
  $("#timeReading").textContent = `${yearGz}年天干十神为${yearRelation}，${monthGz}月天干十神为${monthRelation}。${branchRelation}`;
  $("#chartReading").textContent = `日主为${dayGan}${ELEMENT[dayGan]}。本月天干${monthGz[0]}属${ELEMENT[monthGz[0]]}、地支${monthGz[1]}属${BRANCH_ELEMENT[monthGz[1]]}；这里只陈述结构，不直接下吉凶结论。`;
  updateScopeUi();
  lucide.createIcons();
}

function getInterpretationPayload() {
  const { eight, pillars, yun } = state.chart;
  const scope = state.interpretationScope;
  const yearLunar = Solar.fromYmd(state.year, 7, 1).getLunar();
  const monthLunar = Solar.fromYmd(state.year, state.month + 1, 15).getLunar();
  const yearGz = yearLunar.getYearInGanZhiExact();
  const monthGz = monthLunar.getMonthInGanZhiExact();
  const dayun = yun.getDaYun(9).slice(1).find((item) => state.year >= item.getStartYear() && state.year <= item.getEndYear());

  const chart = {
      pillars: pillars.map((pillar) => ({
        label: pillar.label,
        ganZhi: pillar.gz,
        stemTenGod: pillar.relation,
        hiddenStems: pillar.hidden.map((stem, index) => ({
          stem,
          tenGod: pillar.hiddenRelation[index]
        }))
      })),
      dayMaster: `${eight.getDayGan()}${ELEMENT[eight.getDayGan()]}`,
      mingGong: eight.getMingGong(),
      shenGong: eight.getShenGong()
  };
  if (scope !== "natal" && dayun) {
    chart.dayun = {
        ganZhi: dayun.getGanZhi(),
        stemTenGod: relationToDayMaster(eight.getDayGan(), dayun.getGanZhi()[0]),
        startYear: dayun.getStartYear(),
        endYear: dayun.getEndYear()
    };
  }

  const timing = {};
  if (scope === "year" || scope === "month") {
    Object.assign(timing, {
      year: state.year,
      yearGanZhi: yearGz,
      yearStemTenGod: relationToDayMaster(eight.getDayGan(), yearGz[0])
    });
  }
  if (scope === "month") {
    Object.assign(timing, {
      month: state.month + 1,
      monthGanZhi: monthGz,
      monthStemTenGod: relationToDayMaster(eight.getDayGan(), monthGz[0])
    });
  }

  const natalRule = `日主${eight.getDayGan()}${ELEMENT[eight.getDayGan()]}；四柱天干十神依次为${pillars.map((item) => `${item.label}${item.relation}`).join("、")}。`;
  const rules = [natalRule];
  if (scope === "dayun" && dayun) {
    rules.push(`当前为${dayun.getGanZhi()}大运，大运天干十神为${relationToDayMaster(eight.getDayGan(), dayun.getGanZhi()[0])}。`);
  }
  if (scope === "year") rules.push($("#yearContext").textContent);
  if (scope === "month") rules.push($("#timeReading").textContent, $("#chartReading").textContent);

  return {
    scope,
    scopeLabel: SCOPE_COPY[scope].label,
    chart,
    timing,
    rules,
    question: $("#aiQuestion").value
  };
}

function updateScopeUi() {
  const scope = state.interpretationScope;
  const copy = SCOPE_COPY[scope];
  $("#scopeKicker").textContent = `正在解读 · ${copy.label}`;
  $("#scopeDescription").textContent = copy.description;
  $("#aiQuestion").placeholder = copy.placeholder;
  document.querySelectorAll(".scope-btn").forEach((button) => {
    const active = button.dataset.scope === scope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function setInterpretationScope(scope) {
  if (!SCOPE_COPY[scope] || scope === state.interpretationScope) return;
  state.interpretationScope = scope;
  clearAiOutput();
  updateScopeUi();
}

function clearAiOutput() {
  const output = $("#aiOutput");
  if (!output) return;
  output.hidden = true;
  $("#aiContent").textContent = "";
  $("#aiMeta").textContent = "";
}

function setAiLoading(loading) {
  state.aiLoading = loading;
  const enabled = state.aiConfigured && !loading;
  $("#aiAskBtn").disabled = !enabled;
  $("#aiAskBtn").innerHTML = loading
    ? '<i data-lucide="loader-circle"></i> 解读中'
    : '<i data-lucide="send"></i> 解读';
  $("#aiAskBtn").classList.toggle("loading", loading);
  lucide.createIcons();
}

async function checkAiHealth() {
  try {
    const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
    const result = await response.json();
    state.aiConfigured = Boolean(response.ok && result.configured);
    $("#aiStatus").textContent = state.aiConfigured
      ? `${result.model} · 已连接`
      : "模型待配置";
    $("#aiStatus").classList.toggle("connected", state.aiConfigured);
    $("#ziweiAskBtn").disabled = !state.aiConfigured;
  } catch {
    state.aiConfigured = false;
    $("#aiStatus").textContent = "未连接到 AI 后端，请使用 backend.py 启动。";
  }
  setAiLoading(false);
}

async function requestAiInterpretation() {
  if (!state.aiConfigured || state.aiLoading) return;
  setAiLoading(true);
  $("#aiOutput").hidden = false;
  $("#aiContent").textContent = `正在整理${SCOPE_COPY[state.interpretationScope].label}…`;
  $("#aiMeta").textContent = "";
  try {
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(getInterpretationPayload())
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "解读生成失败");
    $("#aiContent").textContent = result.content;
    $("#aiMeta").textContent = result.cached ? "缓存结果" : "AI 生成";
  } catch (error) {
    $("#aiContent").textContent = error.message || "暂时无法生成解读，请稍后重试。";
    $("#aiMeta").textContent = "请求失败";
  } finally {
    setAiLoading(false);
  }
}

function getZiweiPayload() {
  const chart = state.ziweiChart;
  const selected = chart.palaces.find((palace) => palace.index === state.selectedPalaceIndex);
  const scope = document.querySelector('input[name="ziweiScope"]:checked').value;
  const palaceData = (palace) => ({
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    isBodyPalace: palace.isBodyPalace,
    majorStars: palace.majorStars.map((star) => ({ name: star.name, brightness: star.brightness, mutagen: star.mutagen || "" })),
    minorStars: palace.minorStars.map((star) => ({ name: star.name, brightness: star.brightness || "" })),
    decadalRange: palace.decadal.range
  });
  return {
    chartType: "ziwei",
    scope,
    scopeLabel: scope === "ziweiNatal" ? "紫微本命全盘" : `${selected.name}宫位`,
    chart: {
      fiveElementsClass: chart.fiveElementsClass,
      soul: chart.soul,
      body: chart.body,
      soulPalaceBranch: chart.earthlyBranchOfSoulPalace,
      bodyPalaceBranch: chart.earthlyBranchOfBodyPalace,
      palaces: scope === "ziweiNatal" ? chart.palaces.map(palaceData) : [palaceData(selected)]
    },
    timing: {},
    rules: [
      `采用三合派基础盘与生年四化；五行局为${chart.fiveElementsClass}，命主${chart.soul}，身主${chart.body}。`,
      scope === "ziweiNatal" ? "请结合十二宫、主星、辅煞星与四化整体观察。" : `当前聚焦${selected.name}，不延伸到未提供的运限。`
    ],
    question: $("#ziweiQuestion").value
  };
}

async function requestZiweiInterpretation() {
  if (!state.aiConfigured || state.aiLoading) return;
  state.aiLoading = true;
  $("#ziweiAskBtn").disabled = true;
  $("#ziweiAskBtn").innerHTML = '<i data-lucide="loader-circle"></i> 解读中';
  $("#ziweiAskBtn").classList.add("loading");
  $("#ziweiAiOutput").hidden = false;
  $("#ziweiAiContent").textContent = "正在整理紫微盘数据…";
  $("#ziweiAiMeta").textContent = "";
  lucide.createIcons();
  try {
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(getZiweiPayload())
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "解读生成失败");
    $("#ziweiAiContent").textContent = result.content;
    $("#ziweiAiMeta").textContent = result.cached ? "缓存结果" : "AI 生成";
  } catch (error) {
    $("#ziweiAiContent").textContent = error.message || "暂时无法生成解读，请稍后重试。";
    $("#ziweiAiMeta").textContent = "请求失败";
  } finally {
    state.aiLoading = false;
    $("#ziweiAskBtn").disabled = !state.aiConfigured;
    $("#ziweiAskBtn").innerHTML = '<i data-lucide="send"></i> 解读';
    $("#ziweiAskBtn").classList.remove("loading");
    lucide.createIcons();
  }
}

function switchView(view) {
  const isBazi = view === "bazi";
  $("#baziView").hidden = !isBazi;
  $("#ziweiView").hidden = isBazi;
  $(".profile-panel .method-note p").textContent = isBazi
    ? "子平法 · 立春换年 · 节气定月 · 晚子时换日（流派二）"
    : "三合派基础盘 · 生年四化 · 真太阳时定时辰";
  document.querySelectorAll(".view-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
}

function openDialog(type) {
  const dialog = $("#infoDialog");
  if (type === "privacy") {
    $("#dialogEyebrow").textContent = "隐私说明";
    $("#dialogTitle").textContent = "排盘本地完成，解读按需发送";
    $("#dialogContent").innerHTML = "<p>出生日期、时间、地点和姓名只在浏览器内用于排盘。请求 AI 解读时，仅向本项目后端发送四柱或紫微宫位结果、所选范围和你的问题；模型密钥始终保存在服务端。公开部署前还需补充传输加密、隐私授权和数据保留政策。</p>";
  } else {
    $("#dialogEyebrow").textContent = "计算说明";
    $("#dialogTitle").textContent = "排盘与解读分开";
    const isZiwei = !$("#ziweiView").hidden;
    $("#dialogContent").innerHTML = isZiwei
      ? "<ul><li>紫微盘由固定版本 iztro 2.6.1 计算。</li><li>采用三合派基础盘，显示十二宫、命身宫、五行局、主辅煞星和生年四化。</li><li>出生时辰使用与四柱相同的真太阳时修正结果。</li><li>AI 只能解释页面已生成的宫位数据，不负责安星或推导额外飞化。</li></ul>"
      : "<ul><li>四柱由本地历法库按节气计算，立春换年、节气定月。</li><li>遵义默认经度 106.93°E，真太阳时包含经度差与均时差近似修正。</li><li>大运按阴阳年与性别判定顺逆，起运采用分钟折算法。</li><li>AI 只接收所选范围对应的标准命盘 JSON 与规则结论，不负责排盘。</li></ul>";
  }
  dialog.showModal();
}

$("#birthForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.chart = makeChart(parseBirthForm());
  renderChart();
});
$("#prevYear").addEventListener("click", () => {
  state.year -= 1;
  if (state.interpretationScope !== "natal") clearAiOutput();
  renderDaYun();
  renderYear();
});
$("#nextYear").addEventListener("click", () => {
  state.year += 1;
  if (state.interpretationScope !== "natal") clearAiOutput();
  renderDaYun();
  renderYear();
});
document.querySelectorAll(".view-tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
$("#privacyBtn").addEventListener("click", () => openDialog("privacy"));
$("#methodBtn").addEventListener("click", () => openDialog("method"));
$("#aiAskBtn").addEventListener("click", requestAiInterpretation);
$("#ziweiAskBtn").addEventListener("click", requestZiweiInterpretation);
document.querySelectorAll('input[name="ziweiScope"]').forEach((input) => {
  input.addEventListener("change", () => {
    $("#ziweiAiOutput").hidden = true;
    $("#ziweiQuestion").placeholder = input.value === "ziweiNatal"
      ? "例如：这张盘的核心优势和长期课题是什么？"
      : "例如：当前宫位的主星组合意味着什么？";
  });
});
document.querySelectorAll(".scope-btn").forEach((button) => {
  button.addEventListener("click", () => setInterpretationScope(button.dataset.scope));
});
$(".dialog-close").addEventListener("click", () => $("#infoDialog").close());
$("#infoDialog").addEventListener("click", (event) => {
  if (event.target === $("#infoDialog")) $("#infoDialog").close();
});

state.chart = makeChart(parseBirthForm());
renderChart();
checkAiHealth();
lucide.createIcons();
