# F01: Conversation dependency contract

Replace the 37 short keys injected by the host into createConversationHook and shared by useSmartScan and useResponsePipeline. Preserve the late-bound broadcast getter, hook order, injected values, generation gateway, prompt assembly, diagnostics, and data contracts. Canonical and portable modules and direct tests migrate together. The chat-session dependency bag is separate and will be migrated separately.
