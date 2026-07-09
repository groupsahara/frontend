"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

// Reusable Configuration Card Component
interface ConfigCardProps {
  title: string;
  description: string;
  onSave: () => void;
  children: React.ReactNode;
}

function ConfigCard({ title, description, onSave, children }: ConfigCardProps) {
  return (
    <section className="flex flex-col justify-between rounded-2xl border border-neutral-300 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-neutral-700">
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-semibold text-base text-foreground">{title}</h2>
            <p className="mt-1 text-neutral-600 text-xs dark:text-neutral-350">{description}</p>
          </div>
          <button
            type="button"
            onClick={onSave}
            aria-label={`Save ${title} configuration`}
            className="rounded-full border border-blue-600/30 px-4 py-1 font-semibold text-blue-700 text-xs transition-colors hover:bg-blue-600/5 hover:border-blue-600 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:hover:border-blue-500 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-background outline-none"
          >
            Save
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

// Reusable Form Input Field with Self-Contained Masking Toggles
interface FormInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isSensitive?: boolean;
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  isSensitive = false,
}: FormInputProps) {
  const [showSensitive, setShowSensitive] = useState(false);
  const inputId = React.useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-semibold text-neutral-700 text-[10px] uppercase tracking-wider dark:text-neutral-300"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isSensitive && !showSensitive ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-neutral-300 bg-transparent py-1.5 px-3 pr-10 text-sm text-foreground transition-colors focus:border-blue-500 dark:border-neutral-700 dark:focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-background outline-none"
        />
        {isSensitive && (
          <button
            type="button"
            onClick={() => setShowSensitive(!showSensitive)}
            aria-label={showSensitive ? `Hide sensitive value for ${label}` : `Show sensitive value for ${label}`}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 outline-none rounded p-0.5"
          >
            {showSensitive ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Reusable Form Select Field
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

function FormSelect({ label, value, onChange, options }: FormSelectProps) {
  const inputId = React.useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-semibold text-neutral-700 text-[10px] uppercase tracking-wider dark:text-neutral-300"
      >
        {label}
      </label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-neutral-300 bg-transparent py-1.5 px-3 text-sm transition-colors focus:border-blue-500 dark:border-neutral-700 dark:focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-background outline-none ${
          value === "" ? "text-neutral-500 dark:text-neutral-400" : "text-foreground"
        }`}
      >
        <option value="" disabled className="text-neutral-500 dark:text-neutral-400 bg-background dark:bg-neutral-900">Select an option...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-foreground bg-background dark:bg-neutral-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Config field keys — kept 1:1 with the backend `configure` table columns ──
const FIELD_KEYS = [
  // Twilio
  "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioWebhookUrl",
  // OpenAI
  "openaiApiKey", "openaiOrganizationId", "openaiModel",
  // Gemini
  "geminiApiKey",
  // Web Socket
  "websocketUrl", "websocketConnectionToken",
  // Pinecone
  "pineconeApiKey", "pineconeHost", "pineconeEnvironment", "pineconeIndexName",
  "pineconeNamespace", "pineconeSearchNamespaces", "pineconeTopK",
  // LangChain
  "langchainTracingV2", "langchainApiKey", "langchainProject", "langchainEndpoint",
  // Redis
  "redisHost", "redisPort", "redisPassword", "redisTtlSeconds", "redisSessionTtlSeconds",
  // Deepgram
  "deepgramApiKey",
  // Ollama
  "ollamaUrl",
  // ElevenLabs
  "elevenlabsApiKey", "elevenlabsVoiceId", "elevenlabsModel",
  // Mail / SMTP
  "mailHost", "mailPort", "mailUser", "mailPassword",
  // WhatsApp
  "whatsappApiVersion", "whatsappPhoneNumberId", "whatsappBusinessAccountId",
  "whatsappAccessToken", "whatsappVerifyToken", "whatsappEchoReply",
  // Auth
  "jwtSecret",
  // Frontend
  "frontendUrl",
] as const;

type ConfigKey = (typeof FIELD_KEYS)[number];
type ConfigState = Record<ConfigKey, string>;

const EMPTY_CONFIG: ConfigState = FIELD_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: "" }),
  {} as ConfigState,
);

// Each section maps a localStorage bucket to the fields it owns (per-card "Save")
const SECTIONS: { id: string; title: string; storageKey: string; fields: ConfigKey[] }[] = [
  { id: "twilio", title: "Twilio", storageKey: "tsk_config_twilio", fields: ["twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioWebhookUrl"] },
  { id: "openai", title: "OpenAI", storageKey: "tsk_config_openai", fields: ["openaiApiKey", "openaiOrganizationId", "openaiModel"] },
  { id: "gemini", title: "Gemini", storageKey: "tsk_config_gemini", fields: ["geminiApiKey"] },
  { id: "websocket", title: "Web Socket", storageKey: "tsk_config_websocket", fields: ["websocketUrl", "websocketConnectionToken"] },
  { id: "pinecone", title: "Pinecone", storageKey: "tsk_config_pinecone", fields: ["pineconeApiKey", "pineconeHost", "pineconeEnvironment", "pineconeIndexName", "pineconeNamespace", "pineconeSearchNamespaces", "pineconeTopK"] },
  { id: "langchain", title: "LangChain", storageKey: "tsk_config_langchain", fields: ["langchainTracingV2", "langchainApiKey", "langchainProject", "langchainEndpoint"] },
  { id: "redis", title: "Redis", storageKey: "tsk_config_redis", fields: ["redisHost", "redisPort", "redisPassword", "redisTtlSeconds", "redisSessionTtlSeconds"] },
  { id: "deepgram", title: "Deepgram", storageKey: "tsk_config_deepgram", fields: ["deepgramApiKey"] },
  { id: "ollama", title: "Ollama", storageKey: "tsk_config_ollama", fields: ["ollamaUrl"] },
  { id: "elevenlabs", title: "ElevenLabs", storageKey: "tsk_config_elevenlabs", fields: ["elevenlabsApiKey", "elevenlabsVoiceId", "elevenlabsModel"] },
  { id: "mail", title: "Mail / SMTP", storageKey: "tsk_config_mail", fields: ["mailHost", "mailPort", "mailUser", "mailPassword"] },
  { id: "whatsapp", title: "WhatsApp", storageKey: "tsk_config_whatsapp", fields: ["whatsappApiVersion", "whatsappPhoneNumberId", "whatsappBusinessAccountId", "whatsappAccessToken", "whatsappVerifyToken", "whatsappEchoReply"] },
  { id: "auth", title: "Auth (JWT)", storageKey: "tsk_config_auth", fields: ["jwtSecret"] },
  { id: "frontend", title: "Frontend", storageKey: "tsk_config_frontend", fields: ["frontendUrl"] },
];

const BOOL_OPTIONS = [
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
];

const OPENAI_MODEL_OPTIONS = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-4-turbo", label: "gpt-4-turbo" },
  { value: "gpt-4", label: "gpt-4" },
  { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
];

export default function Configure() {
  const [config, setConfig] = useState<ConfigState>(EMPTY_CONFIG);

  // Load configuration from local storage on mount
  useEffect(() => {
    const loadConfig = () => {
      const updatedConfig: ConfigState = { ...EMPTY_CONFIG };

      for (const section of SECTIONS) {
        const raw = localStorage.getItem(section.storageKey);
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          for (const field of section.fields) {
            updatedConfig[field] = data[field] ?? "";
          }
        } catch {
          // ignore malformed entries
        }
      }

      setConfig(updatedConfig);
    };

    // Defer loading to the next event loop tick to prevent synchronous cascading renders inside useEffect body
    const timeoutId = setTimeout(loadConfig, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const setField = (key: ConfigKey, val: string) =>
    setConfig((prev) => ({ ...prev, [key]: val }));

  // Per-section save — persists only that card's fields (mirrors the per-card Save button)
  const saveSection = (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const data = section.fields.reduce(
      (acc, field) => ({ ...acc, [field]: config[field] }),
      {} as Record<string, string>,
    );
    localStorage.setItem(section.storageKey, JSON.stringify(data));
    toast.success(`${section.title} configuration updated successfully!`);
  };

  return (
    <div className="space-y-10 pb-16">
      <div>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Configuration Files</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 my-1 mb-6">Configure your API Keys for different services</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Twilio */}
          <ConfigCard
            title="Twilio"
            description="View and update your Twilio credentials."
            onSave={() => saveSection("twilio")}
          >
            <FormInput
              label="Account SID"
              value={config.twilioAccountSid}
              onChange={(val) => setField("twilioAccountSid", val)}
              placeholder="Enter Twilio Account SID"
            />
            <FormInput
              label="Auth Token"
              value={config.twilioAuthToken}
              onChange={(val) => setField("twilioAuthToken", val)}
              placeholder="Enter Twilio Auth Token"
              isSensitive
            />
            <FormInput
              label="Twilio Phone Number"
              value={config.twilioPhoneNumber}
              onChange={(val) => setField("twilioPhoneNumber", val)}
              placeholder="+1234567890"
            />
            <FormInput
              label="Twilio Webhook URL"
              value={config.twilioWebhookUrl}
              onChange={(val) => setField("twilioWebhookUrl", val)}
              placeholder="https://your-domain.com/twilio/webhook"
            />
          </ConfigCard>

          {/* OpenAI */}
          <ConfigCard
            title="OpenAI"
            description="View and update your OpenAI API Key."
            onSave={() => saveSection("openai")}
          >
            <FormInput
              label="API KEY"
              value={config.openaiApiKey}
              onChange={(val) => setField("openaiApiKey", val)}
              placeholder="sk-proj-..."
              isSensitive
            />
            <FormInput
              label="Organization ID (Optional)"
              value={config.openaiOrganizationId}
              onChange={(val) => setField("openaiOrganizationId", val)}
              placeholder="org-..."
            />
            <FormSelect
              label="OpenAI Model"
              value={config.openaiModel}
              onChange={(val) => setField("openaiModel", val)}
              options={OPENAI_MODEL_OPTIONS}
            />
          </ConfigCard>

          {/* Gemini */}
          <ConfigCard
            title="Gemini"
            description="View and update your Gemini API Key."
            onSave={() => saveSection("gemini")}
          >
            <FormInput
              label="API KEY"
              value={config.geminiApiKey}
              onChange={(val) => setField("geminiApiKey", val)}
              placeholder="Enter Gemini API Key"
              isSensitive
            />
          </ConfigCard>

          {/* Web Socket */}
          <ConfigCard
            title="Web Socket"
            description="View and update your WebSocket credentials."
            onSave={() => saveSection("websocket")}
          >
            <FormInput
              label="WebSocket URL"
              value={config.websocketUrl}
              onChange={(val) => setField("websocketUrl", val)}
              placeholder="wss://..."
            />
            <FormInput
              label="Connection Token"
              value={config.websocketConnectionToken}
              onChange={(val) => setField("websocketConnectionToken", val)}
              placeholder="Enter Connection Token"
              isSensitive
            />
          </ConfigCard>

          {/* Pinecone */}
          <ConfigCard
            title="Pinecone"
            description="View and update your Pinecone Vector DB credentials."
            onSave={() => saveSection("pinecone")}
          >
            <FormInput
              label="API Key"
              value={config.pineconeApiKey}
              onChange={(val) => setField("pineconeApiKey", val)}
              placeholder="pckey_..."
              isSensitive
            />
            <FormInput
              label="Pinecone Host"
              value={config.pineconeHost}
              onChange={(val) => setField("pineconeHost", val)}
              placeholder="https://..."
            />
            <FormInput
              label="Environment"
              value={config.pineconeEnvironment}
              onChange={(val) => setField("pineconeEnvironment", val)}
              placeholder="us-east-1"
            />
            <FormInput
              label="Index Name"
              value={config.pineconeIndexName}
              onChange={(val) => setField("pineconeIndexName", val)}
              placeholder="sales-agent-index"
            />
            <FormInput
              label="Namespace"
              value={config.pineconeNamespace}
              onChange={(val) => setField("pineconeNamespace", val)}
              placeholder="default"
            />
            <FormInput
              label="Search Namespaces"
              value={config.pineconeSearchNamespaces}
              onChange={(val) => setField("pineconeSearchNamespaces", val)}
              placeholder="ns1,ns2,ns3"
            />
            <FormInput
              label="Top K"
              value={config.pineconeTopK}
              onChange={(val) => setField("pineconeTopK", val)}
              placeholder="5"
            />
          </ConfigCard>

          {/* LangChain */}
          <ConfigCard
            title="LangChain"
            description="View and update your LangChain tracing credentials."
            onSave={() => saveSection("langchain")}
          >
            <FormSelect
              label="Tracing V2"
              value={config.langchainTracingV2}
              onChange={(val) => setField("langchainTracingV2", val)}
              options={BOOL_OPTIONS}
            />
            <FormInput
              label="API Key"
              value={config.langchainApiKey}
              onChange={(val) => setField("langchainApiKey", val)}
              placeholder="ls__..."
              isSensitive
            />
            <FormInput
              label="Project"
              value={config.langchainProject}
              onChange={(val) => setField("langchainProject", val)}
              placeholder="ai-sales-agent"
            />
            <FormInput
              label="Endpoint"
              value={config.langchainEndpoint}
              onChange={(val) => setField("langchainEndpoint", val)}
              placeholder="https://api.smith.langchain.com"
            />
          </ConfigCard>

          {/* Redis */}
          <ConfigCard
            title="Redis"
            description="View and update your Redis Server credentials."
            onSave={() => saveSection("redis")}
          >
            <FormInput
              label="Redis Host"
              value={config.redisHost}
              onChange={(val) => setField("redisHost", val)}
              placeholder="redis-12345.c245.us-east-1-3.ec2.redislabs.com"
            />
            <FormInput
              label="Redis Port"
              value={config.redisPort}
              onChange={(val) => setField("redisPort", val)}
              placeholder="6379"
            />
            <FormInput
              label="Redis Password"
              value={config.redisPassword}
              onChange={(val) => setField("redisPassword", val)}
              placeholder="Enter Redis Password"
              isSensitive
            />
            <FormInput
              label="Redis TTL (Seconds)"
              value={config.redisTtlSeconds}
              onChange={(val) => setField("redisTtlSeconds", val)}
              placeholder="3600"
            />
            <FormInput
              label="Redis Session TTL (Seconds)"
              value={config.redisSessionTtlSeconds}
              onChange={(val) => setField("redisSessionTtlSeconds", val)}
              placeholder="86400"
            />
          </ConfigCard>

          {/* Deepgram */}
          <ConfigCard
            title="Deepgram"
            description="View and update your Deepgram API Key."
            onSave={() => saveSection("deepgram")}
          >
            <FormInput
              label="API KEY"
              value={config.deepgramApiKey}
              onChange={(val) => setField("deepgramApiKey", val)}
              placeholder="Enter Deepgram API Key"
              isSensitive
            />
          </ConfigCard>

          {/* Ollama */}
          <ConfigCard
            title="Ollama"
            description="View and update your Ollama server URL."
            onSave={() => saveSection("ollama")}
          >
            <FormInput
              label="Ollama URL"
              value={config.ollamaUrl}
              onChange={(val) => setField("ollamaUrl", val)}
              placeholder="http://localhost:11434"
            />
          </ConfigCard>

          {/* ElevenLabs */}
          <ConfigCard
            title="ElevenLabs"
            description="View and update your ElevenLabs credentials."
            onSave={() => saveSection("elevenlabs")}
          >
            <FormInput
              label="API KEY"
              value={config.elevenlabsApiKey}
              onChange={(val) => setField("elevenlabsApiKey", val)}
              placeholder="Enter ElevenLabs API Key"
              isSensitive
            />
            <FormInput
              label="Voice ID"
              value={config.elevenlabsVoiceId}
              onChange={(val) => setField("elevenlabsVoiceId", val)}
              placeholder="Enter Voice ID"
            />
            <FormInput
              label="Model"
              value={config.elevenlabsModel}
              onChange={(val) => setField("elevenlabsModel", val)}
              placeholder="eleven_multilingual_v2"
            />
          </ConfigCard>

          {/* Mail / SMTP */}
          <ConfigCard
            title="Mail / SMTP"
            description="View and update your mail server credentials."
            onSave={() => saveSection("mail")}
          >
            <FormInput
              label="Mail Host"
              value={config.mailHost}
              onChange={(val) => setField("mailHost", val)}
              placeholder="smtp.gmail.com"
            />
            <FormInput
              label="Mail Port"
              value={config.mailPort}
              onChange={(val) => setField("mailPort", val)}
              placeholder="587"
            />
            <FormInput
              label="Mail User"
              value={config.mailUser}
              onChange={(val) => setField("mailUser", val)}
              placeholder="you@example.com"
            />
            <FormInput
              label="Mail Password"
              value={config.mailPassword}
              onChange={(val) => setField("mailPassword", val)}
              placeholder="Enter Mail Password"
              isSensitive
            />
          </ConfigCard>

          {/* WhatsApp */}
          <ConfigCard
            title="WhatsApp"
            description="View and update your WhatsApp Cloud API credentials."
            onSave={() => saveSection("whatsapp")}
          >
            <FormInput
              label="API Version"
              value={config.whatsappApiVersion}
              onChange={(val) => setField("whatsappApiVersion", val)}
              placeholder="v21.0"
            />
            <FormInput
              label="Phone Number ID"
              value={config.whatsappPhoneNumberId}
              onChange={(val) => setField("whatsappPhoneNumberId", val)}
              placeholder="Enter Phone Number ID"
            />
            <FormInput
              label="Business Account ID"
              value={config.whatsappBusinessAccountId}
              onChange={(val) => setField("whatsappBusinessAccountId", val)}
              placeholder="Enter Business Account ID"
            />
            <FormInput
              label="Access Token"
              value={config.whatsappAccessToken}
              onChange={(val) => setField("whatsappAccessToken", val)}
              placeholder="Enter Access Token"
              isSensitive
            />
            <FormInput
              label="Verify Token"
              value={config.whatsappVerifyToken}
              onChange={(val) => setField("whatsappVerifyToken", val)}
              placeholder="Enter Verify Token"
              isSensitive
            />
            <FormSelect
              label="Echo Reply"
              value={config.whatsappEchoReply}
              onChange={(val) => setField("whatsappEchoReply", val)}
              options={BOOL_OPTIONS}
            />
          </ConfigCard>

          {/* Auth (JWT) */}
          <ConfigCard
            title="Auth (JWT)"
            description="View and update your JWT signing secret."
            onSave={() => saveSection("auth")}
          >
            <FormInput
              label="JWT Secret"
              value={config.jwtSecret}
              onChange={(val) => setField("jwtSecret", val)}
              placeholder="Enter JWT Secret"
              isSensitive
            />
          </ConfigCard>

          {/* Frontend */}
          <ConfigCard
            title="Frontend"
            description="View and update your frontend application URL."
            onSave={() => saveSection("frontend")}
          >
            <FormInput
              label="Frontend URL"
              value={config.frontendUrl}
              onChange={(val) => setField("frontendUrl", val)}
              placeholder="https://app.example.com"
            />
          </ConfigCard>
        </div>
      </div>
    </div>
  );
}
