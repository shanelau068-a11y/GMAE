# 2026-10-27 维护记录

- dev/build/start统一为Next开发、Next静态导出和本地静态预览，与已有Pages工作流一致。
- 移除构建时下载Google字体的要求，使用本机系统字体；修复Windows旧Vinext导出后的原生退出崩溃。
- 测试实际out/导出页面与HTTP200，保留原GMAE仓库和发布路径。

实际结果及范围见[验证记录](VERIFICATION.md)。
