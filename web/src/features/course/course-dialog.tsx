import { useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import {
  BadgeCheck,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileText,
  GraduationCap,
  Image,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Target,
  UserRound,
  Video,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DialogHeroHeader } from "@/components/common/dialog-hero-header";
import { FormField as Field } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field as ShadcnField,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CreateNoticePayload } from "@/lib/api/notice";
import type { Notice } from "@/lib/api/types";

interface CourseDialogProps {
  editing?: Notice;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (id: string | undefined, payload: CreateNoticePayload) => void;
}

interface UploadValue {
  name: string;
  size: number;
}

interface SyncCourseForm {
  ragFileId: string;
  courseName: string;
  courseType: string;
  audience: string;
  intro: string;
  cover?: UploadValue;
  video?: UploadValue;
  generation: {
    reading: boolean;
    speaking: boolean;
    exam: boolean;
  };
  questions: {
    single: number;
    multiple: number;
    judgement: number;
    shortAnswer: number;
  };
  exam: {
    duration: number;
    attempts: number;
    passingScore: number;
  };
}

const RAG_FILES = [
  { id: "rag-speaking", name: "RAG 推送课件：AI 口语训练素材包" },
  { id: "rag-exam", name: "RAG 推送课件：综合考试题库文档" },
  { id: "rag-reading", name: "RAG 推送课件：阅读理解知识库" },
];

const COURSE_TYPES = [
  { value: "security", label: "安全培训" },
  { value: "compliance", label: "合规学习" },
  { value: "skill", label: "岗位技能" },
  { value: "product", label: "产品知识" },
  { value: "exam", label: "考试复训" },
];

const AUDIENCES = [
  { value: "all", label: "全体员工" },
  { value: "newcomer", label: "新员工" },
  { value: "manager", label: "管理人员" },
  { value: "frontline", label: "一线岗位" },
  { value: "external", label: "外部学员" },
];

function initialForm(editing?: Notice): SyncCourseForm {
  return {
    ragFileId: "",
    courseName: editing?.title ?? "",
    courseType: "security",
    audience: "all",
    intro: editing?.content ?? "",
    generation: {
      reading: true,
      speaking: true,
      exam: true,
    },
    questions: {
      single: 10,
      multiple: 5,
      judgement: 5,
      shortAnswer: 2,
    },
    exam: {
      duration: 60,
      attempts: 3,
      passingScore: 60,
    },
  };
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SectionHeader({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
        {index}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function UploadField({
  id,
  label,
  accept,
  value,
  icon,
  required,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  value?: UploadValue;
  icon: typeof Image;
  required?: boolean;
  onChange: (value?: UploadValue) => void;
}) {
  const Icon = icon;
  return (
    <Field icon={Icon} label={label} htmlFor={id} required={required}>
      <label
        htmlFor={id}
        className={cn(
          "flex h-19 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/25 px-3 text-center transition-colors hover:bg-muted/50",
          value && "border-primary/40 bg-primary/5",
        )}
      >
        <Icon className="size-5 text-primary/70" />
        <span className="max-w-full truncate text-xs font-medium text-foreground/80">
          {value?.name ?? "点击或拖拽上传"}
        </span>
        {value ? (
          <span className="text-[11px] text-muted-foreground">
            {formatSize(value.size)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            支持本地文件暂存
          </span>
        )}
      </label>
      <Input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onChange(file ? { name: file.name, size: file.size } : undefined);
        }}
      />
    </Field>
  );
}

function GenerationCard({
  icon,
  title,
  description,
  active,
  onToggle,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  const Icon = icon;
  return (
    <Button
      type="button"
      variant={active ? "outline" : "secondary"}
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "h-22 flex-col gap-1.5 rounded-xl border px-3 text-center",
        active && "border-primary bg-primary/5 text-primary",
      )}
    >
      <Icon className="size-5" />
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs font-normal text-muted-foreground">
        {description}
      </span>
    </Button>
  );
}

function NumberSetting({
  id,
  label,
  caption,
  icon,
  value,
  min = 0,
  max,
  suffix,
  share,
  onChange,
}: {
  id: string;
  label: string;
  caption: string;
  icon: typeof BookOpen;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  share?: number;
  onChange: (value: number) => void;
}) {
  const Icon = icon;

  function update(next: number) {
    onChange(Math.min(Math.max(next, min), max ?? Number.MAX_SAFE_INTEGER));
  }

  return (
    <ShadcnField className="gap-2.5 rounded-xl border bg-background p-3 shadow-xs transition-colors hover:bg-muted/20">
      <FieldLabel
        htmlFor={id}
        className="flex items-center justify-between gap-3 text-xs font-bold tracking-wide text-foreground/80"
      >
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-primary" />
          {label}
        </span>
      </FieldLabel>
      <FieldDescription className="text-[11px] leading-4">
        {caption}
      </FieldDescription>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => update(Number(event.target.value))}
          className={cn(
            "h-10 bg-muted/25 pr-12 text-center font-mono text-lg font-bold",
            !suffix && "pr-3",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {share !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(share, 100))}%` }}
            />
          </div>
          <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
            {Math.round(share)}%
          </span>
        </div>
      )}
    </ShadcnField>
  );
}

export function CourseDialog({
  editing,
  saving,
  onCancel,
  onSubmit,
}: CourseDialogProps) {
  const [form, setForm] = useState<SyncCourseForm>(() => initialForm(editing));

  const selectedFile = RAG_FILES.find((item) => item.id === form.ragFileId);
  const totalQuestions =
    form.questions.single +
    form.questions.multiple +
    form.questions.judgement +
    form.questions.shortAnswer;
  const valid = useMemo(
    () =>
      Boolean(
        form.ragFileId &&
        form.courseName.trim() &&
        form.courseType &&
        form.audience,
      ),
    [form.audience, form.courseName, form.courseType, form.ragFileId],
  );

  function submit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!valid || saving) return;

    onSubmit(editing?.id, {
      title: form.courseName.trim(),
      notice_type: form.courseType === "practice" ? 2 : 1,
      content: JSON.stringify({
        intro: form.intro,
        rag_file_id: form.ragFileId,
        rag_file_name: selectedFile?.name,
        course_type: form.courseType,
        audience: form.audience,
        cover: form.cover,
        video: form.video,
        generation: form.generation,
        questions: form.questions,
        exam: form.exam,
      }),
      status: 1,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl ring-1 ring-black/8 sm:max-w-3xl dark:ring-white/10"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col">
            <DialogHeroHeader
              icon={RefreshCw}
              eyebrow="课件同步"
              title={editing ? "更新同步课件" : "同步 RAG 课件"}
              description="选择 RAG 推送文件，补全课程信息，并生成跟读、陪练和考试配置。"
              // aside={
              //   <div className="relative flex shrink-0 items-center gap-3 rounded-xl bg-background px-3.5 py-2.5 text-foreground shadow-lg shadow-black/20 ring-2 ring-background/80">
              //     <div>
              //       <p className="text-[9px] font-bold tracking-[0.16em] text-primary/70 uppercase">
              //         AI 任务
              //       </p>
              //       <p className="mt-0.5 text-xs font-bold">
              //         {enabledCount} 项已启用
              //       </p>
              //     </div>
              //     <Badge variant="secondary" className="rounded-full">
              //       自动生成
              //     </Badge>
              //   </div>
              // }
            />

            <ScrollArea className="max-h-[62vh]">
              <div className="px-5 pt-7 sm:px-7">
                <div className="space-y-7 pb-7">
                  <section className="space-y-4">
                    <SectionHeader
                      index="01"
                      title="同步来源"
                      description="选择由 RAG 系统推送的待处理课件文件"
                    />
                    <Field
                      icon={FileArchive}
                      label="待同步课件文件"
                      htmlFor="course-rag-file"
                      required
                    >
                      <Select
                        value={form.ragFileId}
                        onValueChange={(value) =>
                          setForm({ ...form, ragFileId: value })
                        }
                      >
                        <SelectTrigger
                          id="course-rag-file"
                          className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                        >
                          <SelectValue placeholder="-- 请选择自 RAG 系统同步的待处理文件 --" />
                        </SelectTrigger>
                        <SelectContent>
                          {RAG_FILES.map((file) => (
                            <SelectItem key={file.id} value={file.id}>
                              {file.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </section>

                  <section className="space-y-4 border-t border-dashed pt-6">
                    <SectionHeader
                      index="02"
                      title="课件资料"
                      description="维护课件名称、分类、面向人员和展示素材"
                    />
                    <Field
                      icon={FileText}
                      label="课件名称"
                      htmlFor="course-name"
                      required
                    >
                      <Input
                        id="course-name"
                        placeholder="请输入课件名称"
                        value={form.courseName}
                        onChange={(event) =>
                          setForm({ ...form, courseName: event.target.value })
                        }
                        className="h-10 bg-muted/25 px-3"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={Layers3}
                        label="课件类型"
                        htmlFor="course-type"
                        required
                      >
                        <Select
                          value={form.courseType}
                          onValueChange={(value) =>
                            setForm({ ...form, courseType: value })
                          }
                        >
                          <SelectTrigger
                            id="course-type"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="请选择类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {COURSE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field
                        icon={UserRound}
                        label="面向人员"
                        htmlFor="course-audience"
                        required
                      >
                        <Select
                          value={form.audience}
                          onValueChange={(value) =>
                            setForm({ ...form, audience: value })
                          }
                        >
                          <SelectTrigger
                            id="course-audience"
                            className="w-full bg-muted/25 px-3 data-[size=default]:h-10"
                          >
                            <SelectValue placeholder="请选择面向人员" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUDIENCES.map((audience) => (
                              <SelectItem
                                key={audience.value}
                                value={audience.value}
                              >
                                {audience.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field
                      icon={BadgeCheck}
                      label="简介"
                      htmlFor="course-intro"
                    >
                      <Textarea
                        id="course-intro"
                        rows={3}
                        placeholder="请输入课件简介"
                        value={form.intro}
                        onChange={(event) =>
                          setForm({ ...form, intro: event.target.value })
                        }
                        className="min-h-20 resize-none bg-muted/25 px-3"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <UploadField
                        id="course-cover"
                        label="上传课件封面（非必填）"
                        accept="image/*"
                        icon={Image}
                        value={form.cover}
                        onChange={(cover) => setForm({ ...form, cover })}
                      />
                      <UploadField
                        id="course-video"
                        label="上传课件视频"
                        accept="video/*"
                        icon={Video}
                        value={form.video}
                        onChange={(video) => setForm({ ...form, video })}
                      />
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-dashed pt-6">
                    <SectionHeader
                      index="03"
                      title="AI 练习与考试"
                      description="选择课件同步后自动生成的练习和考核内容"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <GenerationCard
                        icon={BookOpen}
                        title="生成跟读练习"
                        description="生成核心金句段落"
                        active={form.generation.reading}
                        onToggle={() =>
                          setForm({
                            ...form,
                            generation: {
                              ...form.generation,
                              reading: !form.generation.reading,
                            },
                          })
                        }
                      />
                      <GenerationCard
                        icon={MessageSquareText}
                        title="生成话术陪练"
                        description="模拟真实对话练习"
                        active={form.generation.speaking}
                        onToggle={() =>
                          setForm({
                            ...form,
                            generation: {
                              ...form.generation,
                              speaking: !form.generation.speaking,
                            },
                          })
                        }
                      />
                      <GenerationCard
                        icon={GraduationCap}
                        title="生成课题考试"
                        description="自动生成考核习题"
                        active={form.generation.exam}
                        onToggle={() =>
                          setForm({
                            ...form,
                            generation: {
                              ...form.generation,
                              exam: !form.generation.exam,
                            },
                          })
                        }
                      />
                    </div>
                  </section>

                  {form.generation.exam && (
                    <section className="flex flex-col gap-4 border-t border-dashed pt-6">
                      <SectionHeader
                        index="04"
                        title="题目与通过规则"
                        description="配置考试题量、考试时长、次数和及格分"
                      />
                      <div className="grid gap-4">
                        <div className="rounded-2xl border bg-background p-4 shadow-xs sm:p-5">
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                                <Bot className="size-4" />
                              </span>
                              <div>
                                <h4 className="text-sm font-semibold">
                                  考题结构
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  调整题型数量，AI 将按占比生成试卷
                                </p>
                              </div>
                            </div>
                            <div className="rounded-xl bg-muted px-3 py-2 text-right">
                              <p className="text-[10px] font-medium text-muted-foreground">
                                总题量
                              </p>
                              <p className="font-mono text-2xl font-bold leading-none">
                                {totalQuestions}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <NumberSetting
                              id="single-count"
                              label="单选题"
                              caption="基础理解与概念辨析"
                              icon={CheckCircle2}
                              value={form.questions.single}
                              share={
                                totalQuestions
                                  ? (form.questions.single / totalQuestions) *
                                    100
                                  : 0
                              }
                              onChange={(single) =>
                                setForm({
                                  ...form,
                                  questions: { ...form.questions, single },
                                })
                              }
                            />
                            <NumberSetting
                              id="multiple-count"
                              label="多选题"
                              caption="综合判断与组合知识"
                              icon={Layers3}
                              value={form.questions.multiple}
                              share={
                                totalQuestions
                                  ? (form.questions.multiple / totalQuestions) *
                                    100
                                  : 0
                              }
                              onChange={(multiple) =>
                                setForm({
                                  ...form,
                                  questions: { ...form.questions, multiple },
                                })
                              }
                            />
                            <NumberSetting
                              id="judgement-count"
                              label="判断题"
                              caption="快速校验关键规则"
                              icon={Target}
                              value={form.questions.judgement}
                              share={
                                totalQuestions
                                  ? (form.questions.judgement /
                                      totalQuestions) *
                                    100
                                  : 0
                              }
                              onChange={(judgement) =>
                                setForm({
                                  ...form,
                                  questions: { ...form.questions, judgement },
                                })
                              }
                            />
                            <NumberSetting
                              id="short-answer-count"
                              label="解答题"
                              caption="开放表达与应用说明"
                              icon={MessageSquareText}
                              value={form.questions.shortAnswer}
                              share={
                                totalQuestions
                                  ? (form.questions.shortAnswer /
                                      totalQuestions) *
                                    100
                                  : 0
                              }
                              onChange={(shortAnswer) =>
                                setForm({
                                  ...form,
                                  questions: { ...form.questions, shortAnswer },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-muted/15 p-4 shadow-xs sm:p-5">
                          <div className="mb-4 flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background">
                              <BadgeCheck className="size-4 text-primary" />
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold">
                                考试设置
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                控制作答时长、提交机会和通过线
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <NumberSetting
                              id="exam-duration"
                              label="考试时间"
                              caption="最长作答时间"
                              icon={Clock3}
                              value={form.exam.duration}
                              suffix="分钟"
                              min={1}
                              onChange={(duration) =>
                                setForm({
                                  ...form,
                                  exam: { ...form.exam, duration },
                                })
                              }
                            />
                            <NumberSetting
                              id="exam-attempts"
                              label="考试次数"
                              caption="每人可提交次数"
                              icon={RotateCcw}
                              value={form.exam.attempts}
                              suffix="次"
                              min={1}
                              onChange={(attempts) =>
                                setForm({
                                  ...form,
                                  exam: { ...form.exam, attempts },
                                })
                              }
                            />
                            <NumberSetting
                              id="exam-passing-score"
                              label="及格分数"
                              caption="通过最低分"
                              icon={BadgeCheck}
                              value={form.exam.passingScore}
                              suffix="分"
                              max={100}
                              onChange={(passingScore) =>
                                setForm({
                                  ...form,
                                  exam: { ...form.exam, passingScore },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mx-0 mb-0 mt-auto flex-row items-center justify-end rounded-none px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !valid}
                  className="min-w-24"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <ShieldCheck />
                      保存
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
