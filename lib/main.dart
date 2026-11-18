import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

import 'deepseek.dart';

void main() => runApp(const Remember());

class Remember extends StatelessWidget {
  const Remember({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Remember',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff466552)),
      scaffoldBackgroundColor: const Color(0xfff6f4ed),
    ),
    home: const Conversation(),
  );
}

enum Mode {
  listen('倾听', '先听懂我，不急着给建议。'),
  reflect('梳理', '帮我分清发生了什么、感受和在意的事。'),
  next('想一步', '和我一起找一个做得到的小行动，决定权留给我。');

  const Mode(this.label, this.prompt);
  final String label;
  final String prompt;
}

class Conversation extends StatefulWidget {
  const Conversation({super.key});

  @override
  State<Conversation> createState() => _ConversationState();
}

class _ConversationState extends State<Conversation> {
  final _draft = TextEditingController();
  final _scroll = ScrollController();
  final _history = <Map<String, String>>[];
  var _key = '';
  var _partial = '';
  String? _notice;
  HttpClient? _request;
  Mode _mode = Mode.listen;

  Future<void> _configure() async {
    final key = await showDialog<String>(
      context: context,
      builder: (_) => _KeyDialog(initialKey: _key),
    );
    if (mounted && key != null) setState(() => _key = key);
  }

  Future<void> _send() async {
    final message = _draft.text.trim();
    if (message.isEmpty || _request != null) return;
    if (_key.isEmpty) await _configure();
    if (!mounted || _key.isEmpty || _request != null) return;

    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 20);
    final messages = [
      {
        'role': 'system',
        'content':
            '你是一个尊重用户自主性的对话助手。用用户的语言回应，'
            '先理解再回应，不假定用户的感受，不做诊断，不假装是人或专业人员，'
            '不鼓励用户依赖你。涉及明确的即时危险时，优先鼓励联系当地紧急服务'
            '或身边可信的人，不编造号码。当前对话偏好：${_mode.prompt}',
      },
      ..._history,
      {'role': 'user', 'content': message},
    ];
    setState(() {
      _request = client;
      _partial = '';
      _notice = null;
      _draft.clear();
      _history.add(messages.last);
    });
    _follow();
    try {
      final request = await client.postUrl(
        Uri.https('api.deepseek.com', '/chat/completions'),
      );
      request.followRedirects = false;
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $_key');
      request.write(
        jsonEncode({
          'model': 'deepseek-flash',
          'messages': messages,
          'stream': true,
          'thinking': {'type': 'disabled'},
        }),
      );
      final response = await request.close().timeout(
        const Duration(seconds: 45),
      );
      if (response.statusCode != 200) {
        throw ChatFailure(switch (response.statusCode) {
          401 || 403 => 'DeepSeek 未接受此密钥，请检查设置。',
          402 => 'DeepSeek 账户余额不足。',
          429 => '请求过于频繁，请稍后重试。',
          final status => 'DeepSeek 返回错误（HTTP $status）。',
        });
      }
      await for (final delta in readReply(
        response.timeout(const Duration(seconds: 60)),
      )) {
        if (!mounted || _request != client) return;
        setState(() => _partial += delta);
        _follow();
      }
      if (_partial.trim().isEmpty) throw ChatFailure('DeepSeek 没有返回文字。');
      if (mounted && _request == client) _finish();
    } catch (error) {
      if (mounted && _request == client) {
        _finish(
          notice: error is ChatFailure ? error.message : '回复未完成。请检查网络后重试。',
          restore: message,
        );
      }
    } finally {
      client.close(force: true);
    }
  }

  void _finish({String? notice, String? restore}) => setState(() {
    _request = null;
    if (restore == null) {
      if (_partial.isNotEmpty) {
        _history.add({'role': 'assistant', 'content': _partial});
      }
    } else {
      _history.removeLast();
      if (_draft.text.isEmpty) _draft.text = restore;
    }
    _partial = '';
    _notice = notice;
  });

  void _stop() {
    _request?.close(force: true);
    _finish(
      notice: '已停止生成。',
      restore: _partial.isEmpty ? _history.last['content'] : null,
    );
  }

  void _follow() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && _scroll.hasClients) {
      _scroll.jumpTo(_scroll.position.maxScrollExtent);
    }
  });

  @override
  void dispose() {
    _request?.close(force: true);
    _draft.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final busy = _request != null;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Remember'),
        actions: [
          TextButton(
            onPressed: busy ? null : _configure,
            child: const Text('API 设置'),
          ),
          TextButton(
            onPressed: busy || _history.isEmpty
                ? null
                : () => setState(() {
                    _history.clear();
                    _notice = null;
                  }),
            child: const Text('新对话'),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ListView(
                      controller: _scroll,
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      children: [
                        if (_history.isEmpty) ...[
                          Text(
                            '今天，想从哪里说起？',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 12),
                          const Text('可以只说一点。也可以先选一种你希望被回应的方式。'),
                        ],
                        for (final item in _history)
                          _bubble(
                            context,
                            item['content']!,
                            item['role'] == 'user',
                          ),
                        if (busy)
                          _bubble(
                            context,
                            _partial.isEmpty ? '正在等待回复…' : _partial,
                            false,
                          ),
                      ],
                    ),
                  ),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final mode in Mode.values)
                        ChoiceChip(
                          label: Text(mode.label),
                          selected: _mode == mode,
                          onSelected: busy
                              ? null
                              : (_) => setState(() => _mode = mode),
                        ),
                    ],
                  ),
                  if (_notice != null)
                    Semantics(liveRegion: true, child: Text(_notice!)),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _draft,
                          enabled: !busy,
                          minLines: 1,
                          maxLines: 5,
                          decoration: const InputDecoration(
                            labelText: '说说你想聊的事',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton(
                        onPressed: busy ? _stop : _send,
                        child: Text(busy ? '停止' : '发送'),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Text('对话仅保留在当前会话；发送时会传给 DeepSeek。'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _bubble(BuildContext context, String message, bool user) => Align(
    alignment: user ? Alignment.centerRight : Alignment.centerLeft,
    child: Card(
      elevation: 0,
      color: user
          ? Theme.of(context).colorScheme.secondaryContainer
          : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SelectableText(message),
      ),
    ),
  );
}

class _KeyDialog extends StatefulWidget {
  const _KeyDialog({required this.initialKey});
  final String initialKey;
  @override
  State<_KeyDialog> createState() => _KeyDialogState();
}

class _KeyDialogState extends State<_KeyDialog> {
  late final _controller = TextEditingController(text: widget.initialKey);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('DeepSeek API Key'),
    content: TextField(
      controller: _controller,
      obscureText: true,
      enableSuggestions: false,
      autocorrect: false,
      decoration: const InputDecoration(
        labelText: 'API Key',
        helperText: '仅在应用运行期间保留，留空可清除。',
      ),
      onSubmitted: (value) => Navigator.pop(context, value.trim()),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('取消'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(context, _controller.text.trim()),
        child: const Text('应用'),
      ),
    ],
  );
}
