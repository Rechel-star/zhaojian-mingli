# 照见 · 命理时间助手

零构建的独立 Web MVP。当前实现四柱、十神、藏干、大运、流年和流月，以及紫微斗数十二宫基础盘。

完整 AI 版：[https://zhaojian-mingli.vercel.app/](https://zhaojian-mingli.vercel.app/)

静态备用版：[https://rechel-star.github.io/zhaojian-mingli/](https://rechel-star.github.io/zhaojian-mingli/)

完整 AI 版本可部署至 Vercel，`api/` 目录包含同源 Python Functions；在 Vercel 项目中配置
`AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL` 三个环境变量即可。

## 本地运行

```bash
cp .env.example .env
# 编辑 .env，填入模型密钥和模型/推理接入点 ID
python3 backend.py
```

访问 `http://localhost:4174/`。

## 当前排盘口径

- 子平法
- 立春换年、节气定月
- 晚子时换日（流派二）
- 大运按阴阳年与性别顺逆排
- 起运采用分钟折算法
- 真太阳时包含出生地经度差与均时差近似修正

紫微斗数：

- `iztro 2.6.1` 固定版本
- 三合派基础盘
- 十二宫、命身宫、五行局、十四主星、辅煞星与生年四化
- 使用与四柱一致的真太阳时结果确定时辰

## AI 后端配置

默认按 DeepSeek 的 OpenAI 兼容接口配置：

```dotenv
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=你的服务端密钥
AI_MODEL=deepseek-chat
```

也可以将 `AI_BASE_URL` 和 `AI_MODEL` 替换为其他 OpenAI 兼容服务。`.env` 已加入忽略列表，不得提交。

## AI 接入边界

AI 不接收原始生日后自行排盘。后端先生成不可变的 `chart JSON`，规则层再产出结构化关系，最后才允许模型组织语言。

解读范围彼此独立：

- `natal`：只发送本命四柱、十神和命身宫
- `dayun`：本命基础上增加当前十年大运
- `year`：本命、大运和所选流年，不发送月份
- `month`：本命、大运、流年和所选流月

```text
浏览器本地排盘 -> 标准命盘 JSON
命盘 JSON + 所选年月 + 规则摘要 -> POST /api/interpret -> AI 文案
```

后端必须负责：

- 模型 API Key、鉴权、限流和调用日志
- 出生档案加密、删除和授权记录
- 规则版本与知识库版本
- 输出结构校验、敏感领域限制和内容免责声明
- 相同命盘与年月的结果缓存

## 下一阶段

1. 建立至少 30 组四柱基准盘，与两个独立排盘源逐项对照。
2. 完成地级市经纬度表和夏令时历史表。
3. 接入四柱合冲刑害、十二长生与强弱分析规则。
4. 增加紫微大限、流年与流月盘叠加。
5. 增加可审核的命理知识库引用。

## 第三方

- `vendor/lunar.js`: [lunar-javascript](https://github.com/6tail/lunar-javascript), MIT License
- `vendor/lucide.min.js`: [Lucide](https://lucide.dev/), ISC License
- `vendor/iztro.min.js`: [iztro](https://github.com/SylarLong/iztro), MIT License
