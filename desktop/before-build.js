// electron-builder beforeBuild 钩子。
// 正常返回 true：走标准流程（用户机器上会正确收集 electron-updater 等运行依赖）。
// 环境变量 CX_SKIP_DEPS=1 时返回 false：跳过依赖收集/重建（沙箱/CI 里 npm 子进程被限制时用），
// 打包出不含运行时依赖的临时产物，仅用于验证布局。
module.exports = async function () {
  return process.env.CX_SKIP_DEPS !== '1';
};