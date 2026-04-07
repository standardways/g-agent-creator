import 'package:agent_shell/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('settings defaults keep subagents enabled', () {
    final defaults = SettingsModel.defaults();
    expect(defaults.enableSubagents, isTrue);
    expect(defaults.backendUrl, isNotEmpty);
  });
}
