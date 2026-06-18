<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">Rust Axum Admin</div>
      <el-menu :default-active="$route.path" router class="menu">
        <el-menu-item index="/depts">
          <el-icon><OfficeBuilding /></el-icon>
          <span>部门管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="spacer" />
        <el-dropdown @command="onCommand">
          <span class="user">
            <el-icon><Avatar /></el-icon>
            {{ user?.nickname || user?.username || '用户' }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                租户：{{ user?.tenant_id }} · {{ user?.is_platform ? '平台超管' : '租户用户' }}
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logout } from '@/api/auth'
import { clearToken, getUser } from '@/utils/auth'

const router = useRouter()
const user = ref(getUser())

async function onCommand(cmd) {
  if (cmd !== 'logout') return
  await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' })
  try {
    await logout()
  } catch {
    // ignore network errors on logout
  }
  clearToken()
  ElMessage.success('已退出登录')
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: #001529;
}
.logo {
  height: 60px;
  line-height: 60px;
  color: #fff;
  font-weight: 600;
  text-align: center;
  font-size: 16px;
}
.menu {
  border-right: none;
  background: transparent;
}
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}
.spacer {
  flex: 1;
}
.user {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
}
</style>
