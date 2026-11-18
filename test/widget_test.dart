import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:remember/deepseek.dart';
import 'package:remember/main.dart';

void main() {
  test('SSE decodes Chinese across byte boundaries', () async {
    final sse = utf8.encode(
      ': keepalive\r\n\r\ndata: {"choices":[{"delta":{"content":"你好"}}]}\r\n\r\n'
      'data: [DONE]\r\n\r\n',
    );
    expect(await readReply(Stream.fromIterable(sse.map((b) => [b]))).toList(), [
      '你好',
    ]);
  });

  test('missing SSE terminator fails', () async {
    await expectLater(
      readReply(const Stream.empty()),
      emitsError(isA<ChatFailure>()),
    );
  });

  testWidgets('opens key settings from the chat screen', (tester) async {
    await tester.pumpWidget(const Remember());
    expect(find.text('倾听'), findsOneWidget);
    await tester.tap(find.text('API 设置'));
    await tester.pumpAndSettle();
    expect(find.text('DeepSeek API Key'), findsOneWidget);
  });
}
