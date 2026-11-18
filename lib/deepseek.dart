import 'dart:convert';

class ChatFailure implements Exception {
  ChatFailure(this.message);
  final String message;
}

/// Read OpenAI-compatible SSE, preserving UTF-8 across network chunks.
Stream<String> readReply(Stream<List<int>> bytes) async* {
  final data = <String>[];
  await for (final line
      in bytes.transform(utf8.decoder).transform(const LineSplitter())) {
    if (line.isNotEmpty) {
      if (line.startsWith('data:')) {
        data.add(line.substring(5).replaceFirst(RegExp(r'^ '), ''));
      }
      continue;
    }
    if (data.isEmpty) continue;
    final event = data.join('\n');
    data.clear();
    if (event == '[DONE]') return;
    final payload = jsonDecode(event);
    if (payload is! Map || payload['error'] != null) {
      throw ChatFailure('DeepSeek 返回了流式回复错误。');
    }
    final choices = payload['choices'];
    if (choices is! List || choices.isEmpty) continue;
    final choice = choices.first;
    final delta = choice['delta'];
    if (delta is Map && delta['content'] is String) {
      yield delta['content'] as String;
    }
    if (choice['finish_reason'] == 'length') {
      throw ChatFailure('回复达到长度限制。');
    }
  }
  throw ChatFailure('回复连接提前结束。');
}
