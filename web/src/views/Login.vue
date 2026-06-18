<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <template #header>
        <div class="login-title">Rust Axum Admin</div>
        <div class="login-sub">多租户管理后台</div>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="onSubmit"
      >
        <el-form-item label="租户编码" prop="tenant_code">
          <el-input v-model="form.tenant_code" placeholder="如 demo / platform">
            <template #prefix><el-icon><OfficeBuilding /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用户名">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loading" @click="onSubmit">
          登录
        </el-button>
        <div class="login-hint">演示账号：demo / admin / Admin@123456</div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, userinfo } from '@/api/auth'
import { setToken, setUser } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  tenant_code: 'demo',
  username: 'admin',
  password: 'Admin@123456',
})

const rules = {
  tenant_code: [{ required: true, message: '请输入租户编码', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const data = await login({ ...form })
    setToken(data.access_token)
    const me = await userinfo()
    setUser(me)
    ElMessage.success('登录成功')
    router.replace(route.query.redirect || '/')
  } catch {
    // errors already surfaced by the http interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f6feb 0%, #6f42c1 100%);
}
.login-card {
  width: 380px;
}
.login-title {
  font-size: 20px;
  font-weight: 600;
}
.login-sub {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}
.login-btn {
  width: 100%;
}
.login-hint {
  margin-top: 12px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}
</style>
