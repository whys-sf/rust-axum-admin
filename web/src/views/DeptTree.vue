<template>
  <div>
    <div class="toolbar">
      <h3 class="title">部门管理</h3>
      <div class="actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate('0')">新增根部门</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="tree"
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
      border
    >
      <el-table-column prop="name" label="部门名称" min-width="220" />
      <el-table-column prop="sort" label="排序" width="80" align="center" />
      <el-table-column prop="leader" label="负责人" width="120" />
      <el-table-column prop="phone" label="联系电话" width="140" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Plus" @click="openCreate(row.id)">新增</el-button>
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parent_id"
            :data="parentOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            check-strictly
            node-key="id"
            class="full"
            placeholder="不选则为根部门"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.leader" placeholder="负责人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="邮箱" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createDept, deleteDept, listDepts, updateDept } from '@/api/dept'

const loading = ref(false)
const tree = ref([])
const formRef = ref()

const dialog = reactive({ visible: false, title: '', saving: false, editingId: null })

const emptyForm = () => ({
  parent_id: '0',
  name: '',
  sort: 0,
  leader: '',
  phone: '',
  email: '',
  status: 1,
})
const form = reactive(emptyForm())

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

// A synthetic root so the tree-select can express "no parent" (id "0"). Ids are
// strings end-to-end (snowflake exceeds JS number precision).
const parentOptions = computed(() => [
  { id: '0', name: '顶级部门', children: tree.value },
])

function formatTime(s) {
  if (!s) return '-'
  return new Date(s).toLocaleString()
}

async function load() {
  loading.value = true
  try {
    tree.value = (await listDepts()) || []
  } finally {
    loading.value = false
  }
}

function resetForm(parentId) {
  Object.assign(form, emptyForm(), { parent_id: parentId })
  formRef.value?.clearValidate()
}

function openCreate(parentId) {
  dialog.editingId = null
  dialog.title = '新增部门'
  resetForm(parentId)
  dialog.visible = true
}

function openEdit(row) {
  dialog.editingId = row.id
  dialog.title = '编辑部门'
  Object.assign(form, {
    parent_id: row.parent_id,
    name: row.name,
    sort: row.sort,
    leader: row.leader || '',
    phone: row.phone || '',
    email: row.email || '',
    status: row.status,
  })
  formRef.value?.clearValidate()
  dialog.visible = true
}

function payload() {
  return {
    parent_id: form.parent_id ?? '0',
    name: form.name,
    sort: form.sort,
    leader: form.leader || null,
    phone: form.phone || null,
    email: form.email || null,
    status: form.status,
  }
}

async function onSubmit() {
  await formRef.value.validate()
  dialog.saving = true
  try {
    if (dialog.editingId == null) {
      await createDept(payload())
      ElMessage.success('新增成功')
    } else {
      await updateDept(dialog.editingId, payload())
      ElMessage.success('修改成功')
    }
    dialog.visible = false
    await load()
  } catch {
    // surfaced by interceptor
  } finally {
    dialog.saving = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确认删除部门「${row.name}」？`, '提示', { type: 'warning' })
  await deleteDept(row.id)
  ElMessage.success('删除成功')
  await load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.title {
  margin: 0;
}
.full {
  width: 100%;
}
</style>
