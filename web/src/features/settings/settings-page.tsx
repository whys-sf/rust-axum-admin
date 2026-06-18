import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fileApi } from '@/lib/api/files'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { settingsApi } from '@/lib/api/settings'
import { PERM, usePermission } from '@/lib/permissions'
import type { AppSettings } from '@/lib/api/types'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const canEdit = usePermission(PERM.configEdit)
  // local edits overlaid on the server value; cleared after a successful save.
  const [edits, setEdits] = useState<Partial<AppSettings>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const mutation = useMutation({
    mutationFn: () => settingsApi.update(edits),
    onSuccess: () => {
      setEdits({})
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      toast.success('设置已保存')
    },
  })

  function value(key: keyof AppSettings): string {
    return edits[key] ?? data?.[key] ?? ''
  }

  function set(key: keyof AppSettings, v: string) {
    setEdits((e) => ({ ...e, [key]: v }))
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  const dirty = Object.keys(edits).length > 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>站点设置</CardTitle>
          <CardDescription>
            站点名称、Logo 与登录页展示。修改后对所有用户即时生效。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            <FormField
              label="站点名称"
              value={value('site_name')}
              placeholder="Rust Axum Admin"
              disabled={!canEdit}
              onChange={(v) => set('site_name', v)}
            />
            <FormField
              label="登录页标题"
              value={value('login_title')}
              placeholder="Rust Axum Admin"
              disabled={!canEdit}
              onChange={(v) => set('login_title', v)}
            />
            <FormField
              label="登录页副标题"
              value={value('login_subtitle')}
              placeholder="多租户管理后台"
              disabled={!canEdit}
              onChange={(v) => set('login_subtitle', v)}
            />
            <ImageUploadField
              label="Logo 图片地址"
              value={value('logo_url')}
              placeholder="https://… (留空使用默认图标)"
              disabled={!canEdit}
              onChange={(v) => set('logo_url', v)}
            />
            <ImageUploadField
              label="登录页背景图地址"
              value={value('login_background')}
              placeholder="https://… (留空使用默认背景)"
              disabled={!canEdit}
              onChange={(v) => set('login_background', v)}
            />
            <Button
              type="submit"
              disabled={!canEdit || !dirty || mutation.isPending}
            >
              保存设置
            </Button>
            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                你没有「保存设置」权限，仅可查看。
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>预览</CardTitle>
          <CardDescription>登录页背景图与 Logo 预览</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">登录页背景</Label>
            <div className="mt-1.5 flex h-40 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
              {value('login_background') ? (
                <img
                  src={value('login_background')}
                  alt="背景预览"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-muted-foreground">默认背景</span>
              )}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Logo</Label>
            <div className="mt-1.5 flex h-16 items-center gap-3">
              {value('logo_url') ? (
                <img
                  src={value('logo_url')}
                  alt="Logo 预览"
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <span className="text-sm text-muted-foreground">默认图标</span>
              )}
              <span className="font-medium">
                {value('site_name') || '站点名称'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface FormFieldProps {
  label: string
  value: string
  placeholder?: string
  disabled?: boolean
  onChange: (v: string) => void
}

function FormField({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** A URL field that also accepts a direct file upload. Uploaded files are
 *  stored publicly (so the login page can read them without auth) and the
 *  resulting URL is written back into the field. */
function ImageUploadField({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: FormFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useMutation({
    mutationFn: (file: File) => fileApi.upload(file, true),
    onSuccess: (item) => {
      onChange(`${window.location.origin}${item.url}`)
      toast.success('上传成功')
    },
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = ''
    },
  })

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload.mutate(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1 size-4" />
          {upload.isPending ? '上传中' : '上传'}
        </Button>
      </div>
    </div>
  )
}
