import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:universal_io/io.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AgentApp());
}

class AgentApp extends StatelessWidget {
  const AgentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: '__AGENT_NAME__',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A7F64)),
        scaffoldBackgroundColor: const Color(0xFFF4F0E8),
      ),
      home: const WorkspaceScreen(),
    );
  }
}

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({super.key});

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  final _http = http.Client();
  final _message = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _workspace = TextEditingController();
  final _backend = TextEditingController();
  final _coreDir = TextEditingController();
  final _coreCommand = TextEditingController();
  final _memoryTitle = TextEditingController();
  final _memoryContent = TextEditingController();
  final _searchQuery = TextEditingController();
  final _knowledgeSelector = TextEditingController();
  final _knowledgeSourcePath = TextEditingController();
  final _knowledgeTitle = TextEditingController();
  final _graphNodeSelector = TextEditingController();
  final _automationTitle = TextEditingController();
  final _automationPrompt = TextEditingController();
  final _automationInterval = TextEditingController(text: '60');
  final _jobTitle = TextEditingController();
  final _jobPrompt = TextEditingController();
  final _mcpWorkspace = TextEditingController();
  final _externalDetectRoot = TextEditingController();
  final _externalSkillRoots = TextEditingController();
  final _todoTitle = TextEditingController();
  final _primaryModel = TextEditingController();
  final _fastModel = TextEditingController();
  final _researcherModel = TextEditingController();
  final _writerModel = TextEditingController();
  final _reviewerModel = TextEditingController();
  final _evolutionTags = TextEditingController();
  final _exportName = TextEditingController(text: 'agent-state');
  final _configEditor = TextEditingController();
  final _configSnapshotEditor = TextEditingController();
  final _companyName = TextEditingController();
  final _companyMission = TextEditingController();
  final _companyDescription = TextEditingController();
  final _goalTitle = TextEditingController();
  final _goalDescription = TextEditingController();
  final _assigneeName = TextEditingController();
  final _assigneeRole = TextEditingController();
  final _recipeTitle = TextEditingController();
  final _recipeDescription = TextEditingController();
  final _recipeValue = TextEditingController();
  final _ultraplanReply = TextEditingController();

  String? _authToken;
  bool _localMode = false;
  bool _busy = false;
  bool _healthy = false;
  bool _enableSubagents = true;
  Process? _coreProcess;
  String? _sessionId;
  String _activeRole = 'executor';
  List<Map<String, String>> _messages = [];
  List<String> _events = [];
  List<String> _artifacts = [];
  List<Map<String, dynamic>> _sessions = [];
  List<Map<String, dynamic>> _memoryEntries = [];
  List<Map<String, dynamic>> _searchResults = [];
  dynamic _knowledgeResults = const [];
  dynamic _codeGraphResults = const [];
  List<Map<String, dynamic>> _automationJobs = [];
  List<Map<String, dynamic>> _backgroundJobs = [];
  List<Map<String, dynamic>> _mcpServers = [];
  List<Map<String, dynamic>> _externalItems = [];
  List<Map<String, dynamic>> _roles = [];
  List<Map<String, dynamic>> _learnedSkills = [];
  List<Map<String, dynamic>> _todos = [];
  List<Map<String, dynamic>> _approvalRequests = [];
  List<Map<String, dynamic>> _eventRows = [];
  List<Map<String, dynamic>> _dreamReports = [];
  List<Map<String, dynamic>> _kairosSignals = [];
  List<Map<String, dynamic>> _artifactRows = [];
  List<Map<String, dynamic>> _threadItems = [];
  List<Map<String, dynamic>> _normalizedHistory = [];
  List<Map<String, dynamic>> _workflowPresets = [];
  List<Map<String, dynamic>> _workflowMissions = [];
  List<Map<String, dynamic>> _notificationRoutes = [];
  List<Map<String, dynamic>> _notificationDeliveries = [];
  List<Map<String, dynamic>> _taskRegistry = [];
  List<Map<String, dynamic>> _queueEntries = [];
  List<Map<String, dynamic>> _companyGoals = [];
  List<Map<String, dynamic>> _companyAssignees = [];
  List<Map<String, dynamic>> _ultraplanSessions = [];
  List<Map<String, dynamic>> _providerCatalog = [];
  List<Map<String, dynamic>> _permissionRecords = [];
  List<Map<String, dynamic>> _recipes = [];
  List<Map<String, dynamic>> _distros = [];
  Map<String, dynamic> _environmentSnapshot = {};
  Map<String, dynamic> _workspaceSummary = {};
  Map<String, dynamic> _workspaceSafety = {};
  Map<String, dynamic> _health = {};
  Map<String, dynamic> _routing = {};
  Map<String, dynamic> _evolution = {};
  Map<String, dynamic> _evolutionPolicy = {};
  Map<String, dynamic> _threadStatus = {};
  Map<String, dynamic> _tokenUsage = {};
  Map<String, dynamic> _compaction = {};
  Map<String, dynamic> _rateLimits = {};
  Map<String, dynamic> _startup = {};
  Map<String, dynamic> _marketplace = {};
  Map<String, dynamic> _codexBridgeStatus = {};
  Map<String, dynamic> _telemetry = {};
  Map<String, dynamic> _startupConfig = {};
  Map<String, dynamic> _securityStatus = {};
  Map<String, dynamic> _openshellStatus = {};
  Map<String, dynamic> _contextEngineStatus = {};
  Map<String, dynamic> _doctor = {};
  Map<String, dynamic> _taskRegistrySummary = {};
  Map<String, dynamic> _queueSummary = {};
  Map<String, dynamic> _configSchema = {};
  Map<String, dynamic> _knowledgeStatus = {};
  Map<String, dynamic> _codeGraphStatus = {};
  Map<String, dynamic> _knowledgeLint = {};
  Map<String, dynamic> _budget = {};
  Map<String, dynamic> _companyProfile = {};
  List<Map<String, dynamic>> _securityFindings = [];
  List<Map<String, dynamic>> _presenceActors = [];
  List<Map<String, dynamic>> _codexModels = [];
  List<Map<String, dynamic>> _codexPlugins = [];
  List<Map<String, dynamic>> _codexSkills = [];
  Map<String, dynamic> _runtimeProfiles = {};
  Map<String, dynamic> _toolsets = {};
  Map<String, dynamic> _skillsHub = {};
  bool _rpcReady = false;
  StreamSubscription<String>? _rpcEvents;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    for (final controller in [
      _message,
      _email,
      _password,
      _workspace,
      _backend,
      _coreDir,
      _coreCommand,
      _memoryTitle,
      _memoryContent,
      _searchQuery,
      _knowledgeSelector,
      _knowledgeSourcePath,
      _knowledgeTitle,
      _graphNodeSelector,
      _automationTitle,
      _automationPrompt,
      _automationInterval,
      _jobTitle,
      _jobPrompt,
      _mcpWorkspace,
      _externalDetectRoot,
      _externalSkillRoots,
      _todoTitle,
      _primaryModel,
      _fastModel,
      _researcherModel,
      _writerModel,
      _reviewerModel,
      _evolutionTags,
      _exportName,
      _configEditor,
      _configSnapshotEditor,
      _companyName,
      _companyMission,
      _companyDescription,
      _goalTitle,
      _goalDescription,
      _assigneeName,
      _assigneeRole,
      _recipeTitle,
      _recipeDescription,
      _recipeValue,
      _ultraplanReply,
    ]) {
      controller.dispose();
    }
    _coreProcess?.kill();
    _rpcEvents?.cancel();
    _http.close();
    super.dispose();
  }

  bool get _signedIn => _localMode || (_authToken?.isNotEmpty ?? false);

  Future<void> _loadSettings() async {
    final settings = await SettingsModel.load();
    _backend.text = settings.backendUrl;
    _workspace.text = settings.workspacePath;
    _coreDir.text = settings.localCoreWorkingDirectory;
    _coreCommand.text = settings.localCoreCommand;
    _mcpWorkspace.text = settings.workspacePath;
    _enableSubagents = settings.enableSubagents;
    _authToken = settings.authToken;
    _localMode = settings.authToken.isEmpty;
    await _refreshAll();
  }

  Future<void> _saveSettings() async {
    await SettingsModel(
      backendUrl: _backend.text.trim(),
      workspacePath: _workspace.text.trim(),
      localCoreWorkingDirectory: _coreDir.text.trim(),
      localCoreCommand: _coreCommand.text.trim(),
      enableSubagents: _enableSubagents,
      authToken: _authToken ?? '',
    ).save();
    if (mounted) Navigator.pop(context);
    await _refreshAll();
  }

  Future<Map<String, String>> _headers() async {
    final headers = {'Content-Type': 'application/json'};
    if (!_localMode && (_authToken?.isNotEmpty ?? false)) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _getJson(String path) async {
    final response = await _http.get(Uri.parse('${_backend.text.trim()}$path'), headers: await _headers());
    if (response.statusCode >= 400) {
      throw StateError(response.body);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> _postJson(String path, Map<String, dynamic> body) async {
    final response = await _http.post(
      Uri.parse('${_backend.text.trim()}$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw StateError(decoded['error'] as String? ?? response.body);
    }
    return decoded;
  }

  Future<Map<String, dynamic>> _rpc(String method, [Map<String, dynamic>? params]) async {
    final response = await _http.post(
      Uri.parse('${_backend.text.trim()}/rpc'),
      headers: await _headers(),
      body: jsonEncode({
        'id': DateTime.now().microsecondsSinceEpoch,
        'method': method,
        'params': params ?? const {},
      }),
    );
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    if (decoded['error'] != null) {
      throw StateError((decoded['error'] as Map<String, dynamic>)['message'] as String? ?? 'RPC error');
    }
    return decoded['result'] as Map<String, dynamic>? ?? const {};
  }

  Future<void> _refreshHealth() async {
    try {
      final health = await _getJson('/health');
      setState(() {
        _healthy = true;
        _health = health;
      });
    } catch (error) {
      setState(() {
        _healthy = false;
        _health = {'error': '$error'};
      });
    }
  }

  Future<void> _refreshAuxiliary() async {
    if (_backend.text.isEmpty) return;
    try {
      if (_mcpWorkspace.text.trim().isNotEmpty) {
        try {
          await _postJson('/api/mcp/import-workspace', {'workspacePath': _mcpWorkspace.text.trim()});
        } catch (_) {
          // Ignore auto-import failures during background refresh.
        }
      }
      final routing = await _getJson('/api/providers/routing');
      final evolution = await _getJson('/api/evolution/status');
      final automations = await _getJson('/api/automations');
      final jobs = await _getJson('/api/jobs');
      final mcp = await _getJson('/api/mcp/servers');
      final roles = await _getJson('/api/agents');
      final learned = await _getJson('/api/skills/learned');
      final todos = await _getJson('/api/todos');
      final approvals = await _getJson('/api/approvals');
      final events = await _getJson('/api/events');
      final dreams = await _getJson('/api/dream/status');
      final kairos = await _getJson('/api/kairos/status');
      final compaction = await _getJson('/api/compaction/status');
      final codexModels = await _getJson('/api/codex/models');
      final codexPlugins = await _getJson('/api/codex/plugins');
      final codexSkills = await _getJson('/api/codex/skills');
      final codexStatus = await _getJson('/api/codex/status');
      final telemetry = await _getJson('/api/telemetry/status');
      final startupConfig = await _getJson('/api/startup/config');
      final securityStatus = await _getJson('/api/security/status');
      final openshellStatus = await _getJson('/api/openshell/status');
      final contextEngine = await _getJson('/api/context-engine');
      final knowledgeStatus = await _getJson('/api/knowledge/status');
      final knowledgeLint = await _getJson('/api/knowledge/wiki/lint');
      final codeGraphStatus = await _getJson('/api/code-graph/status');
      final budget = await _getJson('/api/budget/config');
      final doctor = await _getJson('/api/doctor');
      final configSchema = await _getJson('/api/config/schema');
      final presence = await _getJson('/api/presence');
      final notifications = await _getJson('/api/notifications');
      final workflows = await _getJson('/api/workflows');
      final taskRegistry = await _getJson('/api/tasks/registry');
      final queue = await _getJson('/api/queue');
      final companyProfile = await _getJson('/api/company/profile');
      final companyGoals = await _getJson('/api/company/goals');
      final companyAssignees = await _getJson('/api/company/assignees');
      final ultraplan = await _getJson('/api/ultraplan');
      final providerCatalog = await _getJson('/api/providers/catalog');
      final permissionRecords = await _getJson('/api/permissions');
      final recipes = await _getJson('/api/recipes');
      final distros = await _getJson('/api/distros');
      final runtimeProfiles = await _getJson('/api/runtime/profiles');
      final toolsets = await _getJson('/api/toolsets');
      final skillsHub = await _getJson('/api/skills-hub');
      final environmentSnapshot = await _getJson('/api/environment-snapshot?workspacePath=${Uri.encodeComponent(_workspace.text.trim())}');
      final workspaceSummary = await _getJson('/api/workspace/summary');
      final workspaceSafety = await _getJson('/api/workspace/safety');
      final artifacts = await _getJson('/api/artifacts');
      setState(() {
        _routing = routing;
        _evolution = evolution;
        _evolutionPolicy = Map<String, dynamic>.from(evolution['policy'] as Map? ?? const {});
        _automationJobs = List<Map<String, dynamic>>.from(automations['jobs'] as List? ?? const []);
        _backgroundJobs = List<Map<String, dynamic>>.from(jobs['jobs'] as List? ?? const []);
        _mcpServers = List<Map<String, dynamic>>.from(mcp['servers'] as List? ?? const []);
        _roles = List<Map<String, dynamic>>.from(roles['roles'] as List? ?? const []);
        _learnedSkills = List<Map<String, dynamic>>.from(learned['skills'] as List? ?? const []);
        _todos = List<Map<String, dynamic>>.from(todos['items'] as List? ?? const []);
        _approvalRequests = List<Map<String, dynamic>>.from(approvals['approvals'] as List? ?? const []);
        _eventRows = List<Map<String, dynamic>>.from(events['events'] as List? ?? const []);
        _dreamReports = List<Map<String, dynamic>>.from(dreams['reports'] as List? ?? const []);
        _kairosSignals = List<Map<String, dynamic>>.from(kairos['signals'] as List? ?? const []);
        _compaction = compaction;
        _codexModels = List<Map<String, dynamic>>.from(codexModels['data'] as List? ?? const []);
        _codexPlugins = ((codexPlugins['marketplaces'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .expand((marketplace) => ((marketplace['plugins'] as List?) ?? const []).cast<Map<String, dynamic>>())
            .toList();
        _codexSkills = ((codexSkills['data'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .expand((entry) => ((entry['skills'] as List?) ?? const []).cast<Map<String, dynamic>>())
            .toList();
        _codexBridgeStatus = Map<String, dynamic>.from(codexStatus['bridge'] as Map? ?? const {});
        _telemetry = telemetry;
        _startupConfig = startupConfig;
        _securityStatus = securityStatus;
        _openshellStatus = openshellStatus;
        _contextEngineStatus = contextEngine;
        _knowledgeStatus = knowledgeStatus;
        _knowledgeLint = knowledgeLint;
        _codeGraphStatus = codeGraphStatus;
        _budget = budget;
        _companyName.text = companyProfile['name'] as String? ?? '';
        _companyMission.text = companyProfile['mission'] as String? ?? '';
        _companyDescription.text = companyProfile['description'] as String? ?? '';
        _doctor = doctor;
        _configSchema = configSchema;
        _securityFindings = List<Map<String, dynamic>>.from(securityStatus['findings'] as List? ?? const []);
        _presenceActors = List<Map<String, dynamic>>.from(presence['actors'] as List? ?? const []);
        _notificationRoutes = List<Map<String, dynamic>>.from(notifications['routes'] as List? ?? const []);
        _notificationDeliveries = List<Map<String, dynamic>>.from(notifications['deliveries'] as List? ?? const []);
        _workflowPresets = List<Map<String, dynamic>>.from(workflows['presets'] as List? ?? const []);
        _workflowMissions = List<Map<String, dynamic>>.from(workflows['missions'] as List? ?? const []);
        _taskRegistry = List<Map<String, dynamic>>.from(taskRegistry['records'] as List? ?? const []);
        _taskRegistrySummary = Map<String, dynamic>.from(taskRegistry['summary'] as Map? ?? const {});
        _queueEntries = List<Map<String, dynamic>>.from(queue['entries'] as List? ?? const []);
        _queueSummary = Map<String, dynamic>.from(queue['summary'] as Map? ?? const {});
        _ultraplanSessions = List<Map<String, dynamic>>.from(ultraplan['sessions'] as List? ?? const []);
        _companyProfile = companyProfile;
        _companyGoals = List<Map<String, dynamic>>.from(companyGoals['goals'] as List? ?? const []);
        _companyAssignees = List<Map<String, dynamic>>.from(companyAssignees['assignees'] as List? ?? const []);
        _providerCatalog = List<Map<String, dynamic>>.from(providerCatalog['entries'] as List? ?? const []);
        _permissionRecords = List<Map<String, dynamic>>.from(permissionRecords['records'] as List? ?? const []);
        _recipes = List<Map<String, dynamic>>.from(recipes['recipes'] as List? ?? const []);
        _distros = List<Map<String, dynamic>>.from(distros['profiles'] as List? ?? const []);
        _runtimeProfiles = runtimeProfiles;
        _toolsets = toolsets;
        _skillsHub = skillsHub;
        _environmentSnapshot = environmentSnapshot;
        _workspaceSummary = workspaceSummary;
        _workspaceSafety = workspaceSafety;
        _startup = _health['startup'] as Map<String, dynamic>? ?? const {};
        _marketplace = _health['marketplace'] as Map<String, dynamic>? ?? const {};
        _artifactRows = List<Map<String, dynamic>>.from(artifacts['artifacts'] as List? ?? const []);
        _primaryModel.text = routing['primaryModel'] as String? ?? '';
        _fastModel.text = routing['fastModel'] as String? ?? '';
        _researcherModel.text = routing['researcherModel'] as String? ?? '';
        _writerModel.text = routing['writerModel'] as String? ?? '';
        _reviewerModel.text = routing['reviewerModel'] as String? ?? '';
        _evolutionTags.text = ((evolution['policy'] as Map?)?['tags'] as List? ?? const []).join(', ');
        _externalSkillRoots.text =
            (((skillsHub['config'] as Map?)?['externalRoots'] as List?) ?? const []).join('\n');
      });
      if (_signedIn) {
        final memory = await _getJson('/api/memory');
        setState(() {
          _memoryEntries = List<Map<String, dynamic>>.from(memory['entries'] as List? ?? const []);
        });
      }
    } catch (error) {
      _pushEvent('aux refresh failed: $error');
    }
  }

  Future<void> _loadSessions() async {
    if (!_signedIn || _backend.text.isEmpty) return;
    try {
      final data = _rpcReady ? await _rpc('thread/list') : await _getJson('/api/sessions');
      setState(() {
        _sessions = List<Map<String, dynamic>>.from(
          (_rpcReady ? data['data'] : data['sessions']) as List? ?? const [],
        );
      });
    } catch (error) {
      _pushEvent('session load failed: $error');
    }
  }

  Future<void> _openSession(String id) async {
    setState(() => _sessionId = id);
    if (!_rpcReady) return;
    try {
      final data = await _rpc('thread/read', {
        'threadId': id,
        'includeTurns': true,
      });
      setState(() {
        _messages = _messagesFromThreadRead(data);
        _threadItems = _itemsFromThreadRead(data);
      });
      final history = await _getJson('/api/sessions/$id/history');
      setState(() {
        _normalizedHistory = List<Map<String, dynamic>>.from(history['items'] as List? ?? const []);
      });
    } catch (error) {
      _pushEvent('thread read failed: $error');
    }
  }

  List<Map<String, String>> _messagesFromThreadRead(Map<String, dynamic> data) {
    final result = <Map<String, String>>[];
    final thread = data['thread'] as Map<String, dynamic>? ?? const {};
    final turns = List<Map<String, dynamic>>.from(thread['turns'] as List? ?? const []);
    for (final turn in turns) {
      final items = List<Map<String, dynamic>>.from(turn['items'] as List? ?? const []);
      for (final item in items) {
        final type = item['type'] as String? ?? '';
        if (type == 'userMessage') {
          final content = List<Map<String, dynamic>>.from(item['content'] as List? ?? const []);
          final text = content.map((entry) => entry['text'] as String? ?? '').join('\n').trim();
          if (text.isNotEmpty) result.add({'role': 'user', 'content': text});
        } else if (type == 'agentMessage') {
          final text = item['text'] as String? ?? '';
          if (text.isNotEmpty) result.add({'role': 'assistant', 'content': text});
        } else if (type == 'reasoning') {
          final summary = item['summary'];
          if (summary is List && summary.isNotEmpty) {
            result.add({'role': 'system', 'content': 'Reasoning: ${summary.join(" ")}'});
          }
        }
      }
    }
    return result;
  }

  List<Map<String, dynamic>> _itemsFromThreadRead(Map<String, dynamic> data) {
    final result = <Map<String, dynamic>>[];
    final inlineItems = List<Map<String, dynamic>>.from(data['items'] as List? ?? const []);
    result.addAll(inlineItems);
    final thread = data['thread'] as Map<String, dynamic>? ?? const {};
    final turns = List<Map<String, dynamic>>.from(thread['turns'] as List? ?? const []);
    for (final turn in turns) {
      final turnId = turn['id'] as String?;
      for (final item in List<Map<String, dynamic>>.from(turn['items'] as List? ?? const [])) {
        final decorated = Map<String, dynamic>.from(item);
        if (turnId != null) {
          decorated['turnId'] = turnId;
        }
        result.add(decorated);
      }
    }
    return result;
  }

  Future<void> _refreshAll() async {
    await _initializeRpc();
    await _refreshHealth();
    await _loadSessions();
    await _refreshAuxiliary();
    await _touchPresence();
  }

  Future<void> _initializeRpc() async {
    if (_rpcReady || _backend.text.trim().isEmpty) return;
    try {
      await _rpc('initialize', {
        'clientInfo': {
          'name': 'flutter_shell',
          'title': 'Flutter Shell',
          'version': '0.1.0',
        }
      });
      _rpcReady = true;
      await _startRpcEvents();
    } catch (error) {
      _pushEvent('rpc init failed: $error');
    }
  }

  Future<void> _startRpcEvents() async {
    if (_rpcEvents != null) return;
    final request = http.Request('GET', Uri.parse('${_backend.text.trim()}/rpc/events'));
    final response = await _http.send(request);
    _rpcEvents = response.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen((line) {
      if (!line.startsWith('data: ')) return;
      final payload = jsonDecode(line.substring(6)) as Map<String, dynamic>;
      final method = payload['method'] as String? ?? '';
      final params = payload['params'] as Map<String, dynamic>? ?? const {};
      if (method == 'item/agentMessage/delta') {
        final delta = params['delta'] as String? ?? '';
        setState(() {
          _threadItems = [
            {
              'type': 'agentMessage',
              'delta': delta,
              'itemId': params['itemId'],
              'turnId': params['turnId'],
            },
            ..._threadItems,
          ].take(120).toList();
        });
        if (_messages.isEmpty || _messages.last['role'] != 'assistant') {
          setState(() => _messages = [..._messages, {'role': 'assistant', 'content': delta}]);
        } else {
          final updated = [..._messages];
          updated[updated.length - 1] = {
            'role': 'assistant',
            'content': '${updated.last['content'] ?? ''}$delta',
          };
          setState(() => _messages = updated);
        }
      } else if (method == 'thread/started') {
        _pushEvent('thread started');
      } else if (method == 'thread/status/changed') {
        setState(() {
          _threadStatus = params;
        });
        _pushEvent('thread status changed');
      } else if (method == 'turn/completed') {
        _pushEvent('turn completed');
        unawaited(_refreshAuxiliary());
      } else if (method == 'thread/tokenUsage/updated') {
        setState(() {
          _tokenUsage = params['tokenUsage'] as Map<String, dynamic>? ?? const {};
        });
        unawaited(_refreshAuxiliary());
      } else if (method == 'account/rateLimits/updated') {
        setState(() {
          _rateLimits = params['rateLimits'] as Map<String, dynamic>? ?? const {};
        });
        unawaited(_refreshAuxiliary());
      } else if (method == 'model/rerouted') {
        _pushEvent('model rerouted');
        unawaited(_refreshAuxiliary());
      } else if (method == 'context') {
        _pushEvent(params['message'] as String? ?? 'context update');
      } else if (method == 'approval/requested') {
        _pushEvent('approval requested');
        unawaited(_refreshAuxiliary());
      } else if (method == 'mcpServer/startupStatus/updated') {
        _pushEvent('mcp ${params['name']}: ${params['status']}');
      } else if (method == 'ultraplan/updated') {
        _pushEvent('ultraplan updated');
        unawaited(_refreshAuxiliary());
      } else if (method == 'item/started' || method == 'item/completed') {
        final item = params['item'] as Map<String, dynamic>? ?? const {};
        setState(() {
          _threadItems = [item, ..._threadItems].take(120).toList();
        });
        final itemType = item['type'] as String? ?? 'item';
        final summary = switch (itemType) {
          'userMessage' => 'user message',
          'agentMessage' => 'assistant message',
          'reasoning' => 'reasoning block',
          'commandExecution' => 'command execution',
          'toolCall' => 'tool call',
          _ => itemType,
        };
        _pushEvent('$method: $summary');
      }
    });
  }

  Future<void> _authenticate(String mode) async {
    final response = await _http.post(
      Uri.parse('${_backend.text.trim()}/api/auth/$mode'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': _email.text.trim(),
        'password': _password.text,
      }),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw StateError(data['error'] as String? ?? 'Authentication failed');
    }
    _authToken = data['idToken'] as String?;
    _localMode = false;
    await _saveSettings();
    setState(() {});
  }

  Future<void> _ensureSession() async {
    if (_sessionId != null) return;
    if (_rpcReady) {
      final data = await _rpc('thread/start', {'ephemeral': true});
      setState(() => _sessionId = (data['thread'] as Map<String, dynamic>)['id'] as String);
    } else {
      final title = _message.text.trim().split('\n').first;
      final data = await _postJson('/api/sessions', {'title': title.isEmpty ? 'New session' : title});
      setState(() => _sessionId = (data['session'] as Map<String, dynamic>)['id'] as String);
    }
    await _loadSessions();
  }

  Future<void> _sendMessage() async {
    final text = _message.text.trim();
    if (text.isEmpty || _busy) return;
    if (RegExp(r'(^|[^\w/\\-])ultraplan($|[^\w?.-])', caseSensitive: false).hasMatch(text)) {
      await _launchUltraplan(text.replaceAll(RegExp(r'\bultraplan\b', caseSensitive: false), '').trim());
      _message.clear();
      return;
    }
    await _ensureSession();
    final request = http.Request('POST', Uri.parse('${_backend.text.trim()}/api/chat/stream'));
    request.headers.addAll(await _headers());
    request.body = jsonEncode({
      'sessionId': _sessionId,
      'message': text,
      'workspacePath': _workspace.text.trim(),
      'useSubagents': _enableSubagents,
    });
    setState(() {
      _busy = true;
      _messages = [..._messages, {'role': 'user', 'content': text}];
      _message.clear();
    });
    try {
      final response = await _http.send(request);
      await for (final line in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
        if (!line.startsWith('data: ')) continue;
        final payload = jsonDecode(line.substring(6)) as Map<String, dynamic>;
        final type = payload['type'] as String? ?? 'status';
        if (type == 'role') {
          setState(() {
            _activeRole = payload['role'] as String? ?? _activeRole;
          });
          _pushEvent('role -> ${payload['role']} (${payload['reason'] ?? 'auto'})');
        } else if (type == 'final') {
          setState(() {
            _messages = [..._messages, {'role': 'assistant', 'content': payload['text'] as String? ?? ''}];
            _artifacts = [
              ..._artifacts,
              ...(payload['artifacts'] as List<dynamic>? ?? [])
                  .map((item) => (item as Map<String, dynamic>)['location'] as String? ?? '')
                  .where((value) => value.isNotEmpty),
            ];
          });
        } else if (type == 'evolution') {
          _pushEvent(payload['skillSlug'] as String? ?? payload['error'] as String? ?? 'evolution');
          await _refreshAuxiliary();
        } else if (type == 'dream') {
          _pushEvent('dream -> ${payload['title'] ?? 'reflection'}');
          await _refreshAuxiliary();
        } else {
          _pushEvent(type == 'tool'
              ? '${payload['name']}: ${payload['phase'] ?? payload['outputPreview'] ?? ''}'
              : payload['message'] as String? ?? type);
        }
      }
    } catch (error) {
      _pushEvent('stream failed: $error');
    } finally {
      setState(() => _busy = false);
      await _refreshAll();
    }
  }

  Future<void> _addMemory() async {
    try {
      await _postJson('/api/memory', {
        'title': _memoryTitle.text.trim(),
        'content': _memoryContent.text.trim(),
      });
      _memoryTitle.clear();
      _memoryContent.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('memory failed: $error');
    }
  }

  Future<void> _searchSessions() async {
    try {
      final data = await _postJson('/api/session-search', {
        'query': _searchQuery.text.trim(),
        'limit': 5,
      });
      setState(() {
        _searchResults = List<Map<String, dynamic>>.from(data['results'] as List? ?? const []);
      });
    } catch (error) {
      _pushEvent('session search failed: $error');
    }
  }

  Future<void> _queryKnowledge() async {
    try {
      final data = await _postJson('/api/knowledge/query', {
        'query': _searchQuery.text.trim(),
      });
      setState(() {
        _knowledgeResults = data['results'];
      });
    } catch (error) {
      _pushEvent('knowledge query failed: $error');
    }
  }

  Future<void> _getKnowledgeDocument() async {
    try {
      final data = await _postJson('/api/knowledge/get', {
        'selector': _knowledgeSelector.text.trim(),
      });
      setState(() {
        _knowledgeResults = data;
      });
    } catch (error) {
      _pushEvent('knowledge get failed: $error');
    }
  }

  Future<void> _initKnowledgeWiki() async {
    try {
      await _postJson('/api/knowledge/wiki/init', {});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('knowledge wiki init failed: $error');
    }
  }

  Future<void> _ingestKnowledgeSource() async {
    try {
      await _postJson('/api/knowledge/wiki/ingest', {
        'sourcePath': _knowledgeSourcePath.text.trim(),
        'title': _knowledgeTitle.text.trim().isEmpty ? null : _knowledgeTitle.text.trim(),
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('knowledge ingest failed: $error');
    }
  }

  Future<void> _fileKnowledgeAnswer() async {
    try {
      final latestAssistant = _messages.reversed.firstWhere(
        (message) => message['role'] == 'assistant',
        orElse: () => {'role': 'assistant', 'content': ''},
      );
      final content = latestAssistant['content'] ?? '';
      if (content.trim().isEmpty) {
        _pushEvent('No assistant answer available to file.');
        return;
      }
      await _postJson('/api/knowledge/wiki/file', {
        'title': _knowledgeTitle.text.trim().isEmpty ? 'Filed analysis' : _knowledgeTitle.text.trim(),
        'content': content,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('knowledge file failed: $error');
    }
  }

  Future<void> _buildCodeGraph() async {
    try {
      final data = await _postJson('/api/code-graph/build', {});
      setState(() {
        _codeGraphResults = data['graph'];
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('code graph build failed: $error');
    }
  }

  Future<void> _queryCodeGraph() async {
    try {
      final data = await _postJson('/api/code-graph/query', {
        'question': _searchQuery.text.trim(),
      });
      setState(() {
        _codeGraphResults = data['results'];
      });
    } catch (error) {
      _pushEvent('code graph query failed: $error');
    }
  }

  Future<void> _getCodeGraphNode() async {
    try {
      final data = await _postJson('/api/code-graph/node', {
        'selector': _graphNodeSelector.text.trim(),
      });
      setState(() {
        _codeGraphResults = data;
      });
    } catch (error) {
      _pushEvent('code graph node failed: $error');
    }
  }

  Future<void> _createAutomation() async {
    try {
      await _postJson('/api/automations', {
        'title': _automationTitle.text.trim(),
        'prompt': _automationPrompt.text.trim(),
        'intervalMinutes': int.tryParse(_automationInterval.text.trim()) ?? 60,
      });
      _automationTitle.clear();
      _automationPrompt.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('automation failed: $error');
    }
  }

  Future<void> _createBackgroundJob() async {
    try {
      await _postJson('/api/jobs', {
        'title': _jobTitle.text.trim(),
        'prompt': _jobPrompt.text.trim(),
      });
      _jobTitle.clear();
      _jobPrompt.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('background job failed: $error');
    }
  }

  Future<void> _importMcp() async {
    try {
      await _postJson('/api/mcp/import-workspace', {'workspacePath': _mcpWorkspace.text.trim()});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('mcp import failed: $error');
    }
  }

  Future<void> _detectExternalConfig() async {
    try {
      final data = await _postJson('/api/external-config/detect', {
        'includeHome': false,
        'cwds': [
          if (_externalDetectRoot.text.trim().isNotEmpty) _externalDetectRoot.text.trim(),
        ],
      });
      setState(() {
        _externalItems = List<Map<String, dynamic>>.from(data['items'] as List? ?? const []);
      });
    } catch (error) {
      _pushEvent('external detect failed: $error');
    }
  }

  Future<void> _importExternalConfig() async {
    try {
      final data = await _postJson('/api/external-config/import', {
        'items': _externalItems,
      });
      _pushEvent('imported ${((data['imported'] as List?) ?? const []).length} items');
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('external import failed: $error');
    }
  }

  Future<void> _approveMcp(String id, String status) async {
    try {
      await _postJson('/api/mcp/approve', {'id': id, 'status': status});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('mcp approval failed: $error');
    }
  }

  Future<void> _respondApproval(dynamic id, String decision) async {
    try {
      await _postJson('/api/approvals/respond', {'id': id, 'decision': decision});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('approval response failed: $error');
    }
  }

  String _labelForDecision(String value) {
    switch (value) {
      case 'accept_for_session':
        return 'Accept for session';
      case 'accept_with_execpolicy_amendment':
        return 'Accept with policy';
      case 'apply_network_policy_amendment':
        return 'Apply network policy';
      default:
        if (value.isEmpty) return 'Respond';
        return value
            .replaceAll('_', ' ')
            .split(' ')
            .map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
            .join(' ');
    }
  }

  Future<void> _runEvolutionNow() async {
    if (_sessionId == null) return;
    try {
      await _postJson('/api/evolution/run', {'sessionId': _sessionId});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('evolution failed: $error');
    }
  }

  Future<void> _runDreamNow() async {
    if (_sessionId == null) return;
    try {
      await _postJson('/api/dream/run', {'sessionId': _sessionId});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('dream failed: $error');
    }
  }

  Future<void> _runReviewNow() async {
    if (_sessionId == null || !_rpcReady) return;
    try {
      await _rpc('review/start', {
        'threadId': _sessionId,
        'target': {'type': 'custom', 'instructions': 'Review the current thread and active workspace for risks, regressions, and missing verification.'},
        'delivery': 'inline',
      });
      _pushEvent('review started');
    } catch (error) {
      _pushEvent('review failed: $error');
    }
  }

  Future<void> _runCompactionNow() async {
    if (_sessionId == null) return;
    try {
      await _postJson('/api/compaction/run', {'sessionId': _sessionId});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('compaction failed: $error');
    }
  }

  Future<void> _exportState() async {
    try {
      final data = await _postJson('/api/export/state', {
        'name': _exportName.text.trim(),
      });
      _pushEvent('exported state -> ${data['path']}');
    } catch (error) {
      _pushEvent('export failed: $error');
    }
  }

  Future<void> _deleteLearnedSkill(String slug) async {
    try {
      await _postJson('/api/skills/learned/delete', {'slug': slug});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('delete learned skill failed: $error');
    }
  }

  Future<void> _pinLearnedSkill(String slug, bool pinned) async {
    try {
      await _postJson('/api/skills/learned/pin', {
        'slug': slug,
        'pinned': pinned,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('pin learned skill failed: $error');
    }
  }

  Future<void> _saveEvolutionPolicy() async {
    try {
      await _postJson('/api/evolution/policy', {
        'enabled': _evolutionPolicy['enabled'] ?? true,
        'autoLearn': _evolutionPolicy['autoLearn'] ?? true,
        'minMessages': _evolutionPolicy['minMessages'] ?? 2,
        'requireAssistantReply': _evolutionPolicy['requireAssistantReply'] ?? true,
        'tags': _evolutionTags.text
            .split(',')
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toList(),
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('evolution policy failed: $error');
    }
  }

  Future<void> _addTodo() async {
    try {
      await _postJson('/api/todos', {'title': _todoTitle.text.trim()});
      _todoTitle.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('todo failed: $error');
    }
  }

  Future<void> _updateTodoStatus(String id, String status) async {
    try {
      await _postJson('/api/todos/status', {'id': id, 'status': status});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('todo status failed: $error');
    }
  }

  Future<void> _saveRouting() async {
    try {
      await _postJson('/api/providers/routing', {
        'primaryModel': _primaryModel.text.trim(),
        'fastModel': _fastModel.text.trim(),
        'researcherModel': _researcherModel.text.trim(),
        'writerModel': _writerModel.text.trim(),
        'reviewerModel': _reviewerModel.text.trim(),
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('routing update failed: $error');
    }
  }

  Future<void> _saveRuntimeProfiles() async {
    try {
      await _postJson('/api/runtime/profiles', {
        'active': _runtimeProfiles['active'],
        'profiles': _runtimeProfiles['profiles'] ?? const {},
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('runtime profiles update failed: $error');
    }
  }

  Future<void> _saveToolsets() async {
    try {
      await _postJson('/api/toolsets', {
        'active': _toolsets['active'],
        'profiles': _toolsets['profiles'] ?? const {},
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('toolsets update failed: $error');
    }
  }

  Future<void> _saveSkillsHub() async {
    try {
      await _postJson('/api/skills-hub', {
        'externalRoots': _externalSkillRoots.text
            .split(RegExp(r'[\r\n]+'))
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toList(),
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('skills hub update failed: $error');
    }
  }

  Future<void> _importHubSkill(String sourcePath) async {
    try {
      final data = await _postJson('/api/skills-hub/import', {'sourcePath': sourcePath});
      _pushEvent('imported skill -> ${((data['imported'] as Map?)?['targetDir'] ?? '')}');
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('skills hub import failed: $error');
    }
  }

  Future<void> _runWorkflowPreset(Map<String, dynamic> preset) async {
    final task = _message.text.trim();
    if (task.isEmpty) {
      _pushEvent('Enter a task in the composer before running a workflow preset.');
      return;
    }
    try {
      final data = await _postJson('/api/workflows/run', {
        'workflowId': preset['id'],
        'task': task,
        'sessionId': _sessionId,
      });
      setState(() {
        _message.text = data['prompt'] as String? ?? _message.text;
        _activeRole = data['recommendedRole'] as String? ?? _activeRole;
      });
      _pushEvent('workflow prepared -> ${preset['title']}');
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('workflow run failed: $error');
    }
  }

  Future<void> _updateWorkflowMissionStatus(String id, String status) async {
    try {
      await _postJson('/api/workflows/status', {
        'id': id,
        'status': status,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('workflow status update failed: $error');
    }
  }

  Future<void> _updateQueueStatus(String id, String status) async {
    try {
      await _postJson('/api/queue/status', {
        'id': id,
        'status': status,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('queue status update failed: $error');
    }
  }

  Future<void> _launchUltraplan([String? override]) async {
    final blurb = (override ?? _message.text).trim();
    if (blurb.isEmpty) {
      _pushEvent('Ultraplan needs a prompt to plan.');
      return;
    }
    try {
      await _postJson('/api/ultraplan/launch', {
        'localSessionId': _sessionId,
        'blurb': blurb,
      });
      _pushEvent('Ultraplan launched');
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('ultraplan launch failed: $error');
    }
  }

  Future<void> _respondUltraplan(String id) async {
    try {
      await _postJson('/api/ultraplan/respond', {
        'id': id,
        'response': _ultraplanReply.text.trim(),
      });
      _ultraplanReply.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('ultraplan reply failed: $error');
    }
  }

  Future<void> _handoffUltraplan(String id, String target) async {
    try {
      await _postJson('/api/ultraplan/handoff', {
        'id': id,
        'target': target,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('ultraplan handoff failed: $error');
    }
  }

  Future<void> _stopUltraplan(String id) async {
    try {
      await _postJson('/api/ultraplan/stop', {'id': id});
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('ultraplan stop failed: $error');
    }
  }

  Future<void> _runDoctorRepair(String action) async {
    try {
      await _postJson('/api/doctor/repair', {'action': action});
      _pushEvent('doctor repair applied -> $action');
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('doctor repair failed: $error');
    }
  }

  Future<void> _saveCompanyProfile() async {
    try {
      await _postJson('/api/company/profile', {
        'name': _companyName.text.trim(),
        'mission': _companyMission.text.trim(),
        'description': _companyDescription.text.trim(),
        'status': _companyProfile['status'] ?? 'active',
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('company profile save failed: $error');
    }
  }

  Future<void> _createCompanyGoal() async {
    try {
      await _postJson('/api/company/goals', {
        'title': _goalTitle.text.trim(),
        'description': _goalDescription.text.trim(),
      });
      _goalTitle.clear();
      _goalDescription.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('company goal create failed: $error');
    }
  }

  Future<void> _updateCompanyGoalStatus(String id, String status) async {
    try {
      await _postJson('/api/company/goals/status', {
        'id': id,
        'status': status,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('company goal status failed: $error');
    }
  }

  Future<void> _createCompanyAssignee() async {
    try {
      await _postJson('/api/company/assignees', {
        'name': _assigneeName.text.trim(),
        'role': _assigneeRole.text.trim(),
      });
      _assigneeName.clear();
      _assigneeRole.clear();
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('company assignee create failed: $error');
    }
  }

  Future<void> _updateCompanyAssigneeStatus(String id, String status) async {
    try {
      await _postJson('/api/company/assignees/status', {
        'id': id,
        'status': status,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('company assignee status failed: $error');
    }
  }

  Future<void> _runRecipe(Map<String, dynamic> recipe) async {
    try {
      final data = await _postJson('/api/recipes/run', {
        'id': recipe['id'],
        'values': {
          if (_recipeValue.text.trim().isNotEmpty)
            ...((recipe['parameters'] as List?) ?? const []).whereType<Map>().fold<Map<String, String>>({}, (map, param) {
              final key = (param['key'] ?? '').toString();
              if (key.isNotEmpty) {
                map[key] = _recipeValue.text.trim();
              }
              return map;
            }),
        },
        'sessionId': _sessionId,
      });
      setState(() {
        _message.text = data['prompt'] as String? ?? _message.text;
      });
      _pushEvent('recipe prepared -> ${recipe['title']}');
    } catch (error) {
      _pushEvent('recipe run failed: $error');
    }
  }

  Future<void> _openConfigSnapshotDialog() async {
    try {
      final snapshot = await _getJson('/api/config/snapshot');
      _configSnapshotEditor.text = const JsonEncoder.withIndent('  ').convert(snapshot);
    } catch (error) {
      _pushEvent('config snapshot load failed: $error');
      return;
    }

    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Config Snapshot', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _configSnapshotEditor,
              minLines: 14,
              maxLines: 24,
              decoration: const InputDecoration(
                labelText: 'Snapshot JSON',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      _configSnapshotEditor.text = '';
                    },
                    child: const Text('Clear'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: () async {
                      try {
                        final payload = jsonDecode(_configSnapshotEditor.text) as Map<String, dynamic>;
                        await _postJson('/api/config/snapshot', payload);
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        _pushEvent('config snapshot applied');
                        await _refreshAuxiliary();
                      } catch (error) {
                        _pushEvent('config snapshot apply failed: $error');
                      }
                    },
                    child: const Text('Apply snapshot'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveStartupConfig() async {
    try {
      await _postJson('/api/startup/config', {
        'mode': _startupConfig['mode'] ?? 'default',
        'prewarmCodex': _startupConfig['prewarmCodex'] ?? true,
        'enableAutomationLoop': _startupConfig['enableAutomationLoop'] ?? true,
        'enableKairosLoop': _startupConfig['enableKairosLoop'] ?? true,
        'deferredDelayMs': _startupConfig['deferredDelayMs'] ?? 500,
      });
      await _refreshAuxiliary();
    } catch (error) {
      _pushEvent('startup config update failed: $error');
    }
  }

  Future<void> _touchPresence() async {
    try {
      await _postJson('/api/presence/touch', {
        'id': 'shell:flutter',
        'kind': 'shell',
        'label': '__AGENT_NAME__ shell',
        'host': _backend.text.trim(),
        'version': '0.1.0',
        'mode': kIsWeb ? 'web' : 'desktop',
        'reason': 'heartbeat',
      });
    } catch (_) {
      // Best effort only.
    }
  }

  Future<void> _openConfigEditor() async {
    final sections = List<Map<String, dynamic>>.from(_configSchema['sections'] as List? ?? const []);
    if (sections.isEmpty) {
      _pushEvent('No config schema sections loaded yet.');
      return;
    }

    Map<String, dynamic> selected = sections.first;
    _configEditor.text = const JsonEncoder.withIndent('  ').convert(selected['current'] ?? const {});

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Config Editor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              DropdownButton<String>(
                value: selected['id'] as String?,
                isExpanded: true,
                items: sections
                    .map((section) => DropdownMenuItem(
                          value: section['id'] as String?,
                          child: Text(section['title'] as String? ?? section['id'] as String? ?? ''),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  final next = sections.firstWhere((section) => section['id'] == value);
                  setModalState(() {
                    selected = next;
                    _configEditor.text =
                        const JsonEncoder.withIndent('  ').convert(next['current'] ?? const {});
                  });
                },
              ),
              const SizedBox(height: 8),
              SelectableText(
                'Schema:\n${const JsonEncoder.withIndent('  ').convert(selected['schema'] ?? const {})}',
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _configEditor,
                minLines: 12,
                maxLines: 20,
                decoration: const InputDecoration(
                  labelText: 'Section JSON',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: () async {
                    try {
                      final payload = jsonDecode(_configEditor.text) as Map<String, dynamic>;
                      await _postJson(selected['endpoint'] as String, payload);
                      if (!context.mounted) return;
                      Navigator.pop(context);
                      _pushEvent('saved config section -> ${selected['title'] ?? selected['id']}');
                      await _refreshAuxiliary();
                    } catch (error) {
                      _pushEvent('config save failed: $error');
                    }
                  },
                  child: const Text('Save section'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openConfigFormEditor() async {
    final sections = List<Map<String, dynamic>>.from(_configSchema['sections'] as List? ?? const []);
    if (sections.isEmpty) {
      _pushEvent('No config schema sections loaded yet.');
      return;
    }

    Map<String, dynamic> selected = sections.first;
    Map<String, dynamic> formData = Map<String, dynamic>.from(selected['current'] as Map? ?? const {});

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final schema = Map<String, dynamic>.from(selected['schema'] as Map? ?? const {});
          final properties = Map<String, dynamic>.from(schema['properties'] as Map? ?? const {});

          Widget buildField(String key, Map<String, dynamic> propertySchema) {
            final enumValues = (propertySchema['enum'] as List?)?.whereType<String>().toList();
            final fieldType = propertySchema['type'] as String?;
            final value = formData[key];

            if (enumValues != null && enumValues.isNotEmpty) {
              return DropdownButtonFormField<String>(
                initialValue: value is String && enumValues.contains(value) ? value : enumValues.first,
                items: enumValues
                    .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                    .toList(),
                decoration: InputDecoration(labelText: key),
                onChanged: (next) {
                  if (next == null) return;
                  setModalState(() {
                    formData[key] = next;
                  });
                },
              );
            }

            if (fieldType == 'boolean') {
              return SwitchListTile(
                value: value as bool? ?? false,
                onChanged: (next) {
                  setModalState(() {
                    formData[key] = next;
                  });
                },
                title: Text(key),
              );
            }

            if (fieldType == 'number' || fieldType == 'integer') {
              final controller = TextEditingController(text: value?.toString() ?? '');
              return TextField(
                controller: controller,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: key),
                onChanged: (next) {
                  final parsed = num.tryParse(next);
                  setModalState(() {
                    formData[key] = parsed;
                  });
                },
              );
            }

            if (fieldType == 'array' &&
                propertySchema['items'] is Map &&
                (propertySchema['items'] as Map)['type'] == 'string') {
              final controller = TextEditingController(
                text: ((value as List?) ?? const []).whereType<String>().join('\n'),
              );
              return TextField(
                controller: controller,
                minLines: 3,
                maxLines: 6,
                decoration: InputDecoration(labelText: '$key (one per line)'),
                onChanged: (next) {
                  setModalState(() {
                    formData[key] = next
                        .split(RegExp(r'[\r\n]+'))
                        .map((item) => item.trim())
                        .where((item) => item.isNotEmpty)
                        .toList();
                  });
                },
              );
            }

            final controller = TextEditingController(text: value?.toString() ?? '');
            return TextField(
              controller: controller,
              decoration: InputDecoration(labelText: key),
              onChanged: (next) {
                setModalState(() {
                  formData[key] = next;
                });
              },
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 24,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Config Form Editor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                DropdownButton<String>(
                  value: selected['id'] as String?,
                  isExpanded: true,
                  items: sections
                      .map((section) => DropdownMenuItem(
                            value: section['id'] as String?,
                            child: Text(section['title'] as String? ?? section['id'] as String? ?? ''),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    final next = sections.firstWhere((section) => section['id'] == value);
                    setModalState(() {
                      selected = next;
                      formData = Map<String, dynamic>.from(next['current'] as Map? ?? const {});
                    });
                  },
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: properties.entries
                        .map((entry) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: buildField(
                                entry.key,
                                Map<String, dynamic>.from(entry.value as Map? ?? const {}),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: () async {
                      try {
                        await _postJson(selected['endpoint'] as String, formData);
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        _pushEvent('saved config form -> ${selected['title'] ?? selected['id']}');
                        await _refreshAuxiliary();
                      } catch (error) {
                        _pushEvent('config form save failed: $error');
                      }
                    },
                    child: const Text('Save form'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _startLocalCore() async {
    if (kIsWeb || _coreProcess != null) return;
    final shell = Platform.isWindows ? 'cmd.exe' : 'sh';
    final args = Platform.isWindows ? ['/c', _coreCommand.text.trim()] : ['-lc', _coreCommand.text.trim()];
    final process = await Process.start(
      shell,
      args,
      workingDirectory: _coreDir.text.trim(),
      runInShell: true,
    );
    setState(() => _coreProcess = process);
    process.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen((line) => _pushEvent(line));
    process.stderr.transform(utf8.decoder).transform(const LineSplitter()).listen((line) => _pushEvent('ERR $line'));
    process.exitCode.then((_) => setState(() => _coreProcess = null));
  }

  void _pushEvent(String value) {
    setState(() {
      _events = [value, ..._events].take(50).toList();
    });
  }

  String _fmtCount(Map<String, dynamic> source, String key) {
    final value = source[key];
    return value == null ? '0' : '$value';
  }

  Widget _statusChip(String label, String value) {
    return Chip(
      label: Text('$label: $value'),
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _summaryPair(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _knowledgeResultsView() {
    final data = _knowledgeResults;
    if (data is List) {
      final rows = data.cast<dynamic>();
      if (rows.isEmpty) {
        return const Text('No knowledge results yet');
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rows.take(12).map((row) {
          if (row is Map) {
            final map = Map<String, dynamic>.from(row.cast<String, dynamic>());
            final title = (map['title'] ?? map['path'] ?? map['id'] ?? 'result').toString();
            final subtitle = [
              if ((map['score'] ?? '').toString().isNotEmpty) 'score: ${map['score']}',
              if ((map['summary'] ?? '').toString().isNotEmpty) map['summary'].toString(),
              if ((map['snippet'] ?? '').toString().isNotEmpty) map['snippet'].toString(),
              if ((map['path'] ?? '').toString().isNotEmpty) map['path'].toString(),
            ].where((value) => value.trim().isNotEmpty).join('\n');
            return ListTile(
              dense: true,
              title: Text(title),
              subtitle: Text(
                subtitle,
                maxLines: 6,
                overflow: TextOverflow.ellipsis,
              ),
            );
          }
          return ListTile(dense: true, title: Text(row.toString()));
        }).toList(),
      );
    }
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      if ((map['content'] as String? ?? '').isNotEmpty) {
        return SelectableText(map['content'] as String);
      }
      return SelectableText(const JsonEncoder.withIndent('  ').convert(map));
    }
    return const Text('No knowledge results yet');
  }

  Widget _codeGraphResultsView() {
    final data = _codeGraphResults;
    if (data is List) {
      final rows = data.cast<dynamic>();
      if (rows.isEmpty) return const Text('No graph query results yet');
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rows.take(12).map((row) {
          if (row is Map) {
            final map = Map<String, dynamic>.from(row.cast<String, dynamic>());
            return ListTile(
              dense: true,
              title: Text((map['title'] ?? map['id'] ?? 'node').toString()),
              subtitle: Text(
                [
                  if ((map['summary'] ?? '').toString().isNotEmpty) map['summary'].toString(),
                  if ((map['path'] ?? '').toString().isNotEmpty) map['path'].toString(),
                  if ((map['score'] ?? '').toString().isNotEmpty) 'score: ${map['score']}',
                ].where((value) => value.trim().isNotEmpty).join('\n'),
              ),
            );
          }
          return ListTile(dense: true, title: Text(row.toString()));
        }).toList(),
      );
    }
    if (data is Map) {
      return SelectableText(const JsonEncoder.withIndent('  ').convert(data));
    }
    return const Text('No graph query results yet');
  }

  String _workflowControlSubtitle(Map<String, dynamic> mission) {
    return [
      mission['workflowId'] as String? ?? '',
      mission['status'] as String? ?? '',
      if ((mission['lane'] as String? ?? '').isNotEmpty) mission['lane'] as String,
      if (((mission['dependsOnIds'] as List?) ?? const []).isNotEmpty)
        'depends: ${((mission['dependsOnIds'] as List?) ?? const []).join(", ")}',
      if ((mission['detail'] as String? ?? '').isNotEmpty) mission['detail'] as String,
    ].where((value) => value.trim().isNotEmpty).join(' · ');
  }

  String _queueControlSubtitle(Map<String, dynamic> entry) {
    return [
      entry['lane'] as String? ?? '',
      entry['mode'] as String? ?? '',
      entry['status'] as String? ?? '',
      if (((entry['dependsOnIds'] as List?) ?? const []).isNotEmpty)
        'depends: ${((entry['dependsOnIds'] as List?) ?? const []).join(", ")}',
      if ((entry['detail'] as String? ?? '').isNotEmpty) entry['detail'] as String,
    ].where((value) => value.trim().isNotEmpty).join(' · ');
  }

  String _presenceSummary(Map<String, dynamic> actor) {
    return [
      actor['kind'] as String? ?? '',
      actor['mode'] as String? ?? '',
      actor['host'] as String? ?? '',
      actor['reason'] as String? ?? '',
      actor['lastSeenAt'] as String? ?? '',
    ].where((value) => value.trim().isNotEmpty).join(' · ');
  }

  List<Widget> _recommendedActionButtons() {
    final buttons = <Widget>[];
    if (!_healthy) {
      buttons.add(FilledButton(onPressed: _refreshAll, child: const Text('Recover connection')));
    }

    final doctorFindings = List<Map<String, dynamic>>.from(_doctor['findings'] as List? ?? const []);
    final repairable = doctorFindings
        .map((finding) => finding['repairAction'] as String?)
        .whereType<String>()
        .toSet()
        .take(3);
    for (final action in repairable) {
      buttons.add(OutlinedButton(
        onPressed: () => _runDoctorRepair(action),
        child: Text(action.replaceAll('_', ' ')),
      ));
    }

    if ((_knowledgeStatus['enabled'] ?? false) == false) {
      buttons.add(OutlinedButton(onPressed: _openConfigFormEditor, child: const Text('Enable knowledge')));
    }
    if ((_queueSummary['queued'] ?? 0) is num && ((_queueSummary['queued'] ?? 0) as num) > 0) {
      buttons.add(OutlinedButton(onPressed: _refreshAll, child: const Text('Review queued work')));
    }
    if (_securityFindings.isNotEmpty) {
      buttons.add(OutlinedButton(
        onPressed: () => _runDoctorRepair('apply_safe_security_defaults'),
        child: const Text('Harden security'),
      ));
    }
    return buttons.take(6).toList();
  }

  String _summarizeThreadItem(Map<String, dynamic> item) {
    final type = item['type'] as String? ?? 'item';
    if (type == 'userMessage') {
      final content = List<Map<String, dynamic>>.from(item['content'] as List? ?? const []);
      return content.map((entry) => entry['text'] as String? ?? '').join(' ').trim();
    }
    if (type == 'agentMessage') {
      return item['text'] as String? ?? item['delta'] as String? ?? '';
    }
    if (type == 'reasoning') {
      final summary = item['summary'];
      if (summary is List) return summary.join(' ');
    }
    if (item['message'] is String) {
      return item['message'] as String;
    }
    return const JsonEncoder.withIndent('  ').convert(item);
  }

  Future<void> _openSettings() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _backend, decoration: const InputDecoration(labelText: 'Backend URL')),
            TextField(controller: _workspace, decoration: const InputDecoration(labelText: 'Workspace path')),
            TextField(controller: _coreDir, decoration: const InputDecoration(labelText: 'Core working directory')),
            TextField(controller: _coreCommand, decoration: const InputDecoration(labelText: 'Core launch command')),
            SwitchListTile(
              value: _enableSubagents,
              onChanged: (value) => setState(() => _enableSubagents = value),
              title: const Text('Enable optional subagents'),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(onPressed: _saveSettings, child: const Text('Save')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card(String title, Widget child) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_signedIn) {
      return Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('__AGENT_NAME__', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
                    const SizedBox(height: 12),
                    TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: FilledButton(onPressed: () => _authenticate('login'), child: const Text('Sign in'))),
                        const SizedBox(width: 12),
                        Expanded(child: OutlinedButton(onPressed: () => _authenticate('register'), child: const Text('Register'))),
                      ],
                    ),
                    TextButton(
                      onPressed: () async {
                        setState(() => _localMode = true);
                        await _saveSettings();
                        await _refreshAll();
                      },
                      child: const Text('Continue in local mode'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    final isWide = MediaQuery.of(context).size.width > 1380;
    final sessionsPane = Container(
      width: 260,
      decoration: const BoxDecoration(border: Border(right: BorderSide(color: Color(0x22000000)))),
      child: ListView(
        children: [
          const ListTile(title: Text('Sessions')),
          for (final session in _sessions)
            ListTile(
              title: Text(session['title'] as String? ?? 'Untitled'),
              subtitle: Text(session['updatedAt'] as String? ?? ''),
              selected: _sessionId == session['id'],
              onTap: () => _openSession(session['id'] as String),
            ),
        ],
      ),
    );

    final chatPane = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: [
              const Text('Detected role:'),
              const SizedBox(width: 12),
              Chip(label: Text(_activeRole)),
              const Spacer(),
              Text('${_roles.length} roles'),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final message in _messages)
                Align(
                  alignment: message['role'] == 'user' ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 760),
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: message['role'] == 'user' ? const Color(0xFF1A7F64) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: SelectableText(
                      message['content'] ?? '',
                      style: TextStyle(color: message['role'] == 'user' ? Colors.white : Colors.black87),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _message,
                  minLines: 1,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    hintText: 'Ask the agent to research, code, write, analyze, or execute work on the computer',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(onPressed: _busy ? null : _sendMessage, child: Text(_busy ? 'Running...' : 'Send')),
            ],
          ),
        ),
      ],
    );

    final operationsPane = DefaultTabController(
      length: 7,
      child: Column(
        children: [
          const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Events'),
              Tab(text: 'Todos'),
              Tab(text: 'Memory'),
              Tab(text: 'Search'),
              Tab(text: 'Automation'),
              Tab(text: 'MCP'),
              Tab(text: 'Meta'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    ..._approvalRequests.map((approval) => Card(
                          child: ListTile(
                            title: Text(approval['title'] as String? ?? approval['method'] as String? ?? 'approval'),
                            subtitle: Text(approval['detail'] as String? ?? ''),
                            isThreeLine: true,
                          ),
                        )),
                    ..._approvalRequests.map((approval) => Card(
                          margin: const EdgeInsets.only(top: 0, bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final decision in (((approval['availableDecisions'] as List?) ?? const ['accept', 'decline']).whereType<String>()))
                                  OutlinedButton(
                                    onPressed: () => _respondApproval(approval['id'], decision),
                                    child: Text(_labelForDecision(decision)),
                                  ),
                              ],
                            ),
                          ),
                        )),
                    ..._eventRows.map((event) => ListTile(
                          title: Text(event['kind'] as String? ?? ''),
                          subtitle: Text(event['summary'] as String? ?? ''),
                          dense: true,
                        )),
                    if (_threadItems.isNotEmpty)
                      _card(
                        'Codex Thread Items',
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: _threadItems.take(20).map((item) {
                            final type = item['type'] as String? ?? 'item';
                            return ListTile(
                              dense: true,
                              title: Text(type),
                              subtitle: Text(
                                _summarizeThreadItem(item),
                                maxLines: 5,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    if (_normalizedHistory.isNotEmpty)
                      _card(
                        'Normalized History',
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: _normalizedHistory.take(12).map((item) {
                            return ListTile(
                              dense: true,
                              title: Text(item['role'] as String? ?? ''),
                              subtitle: Text(
                                item['content'] as String? ?? '',
                                maxLines: 5,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ..._events.map((event) => ListTile(title: Text(event))),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'Todo Queue',
                      Column(
                        children: [
                          TextField(controller: _todoTitle, decoration: const InputDecoration(labelText: 'New todo')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _addTodo, child: const Text('Add todo')),
                          ),
                        ],
                      ),
                    ),
                    ..._todos.map((todo) => Card(
                          child: ListTile(
                            title: Text(todo['title'] as String? ?? ''),
                            subtitle: Text(todo['status'] as String? ?? ''),
                            trailing: DropdownButton<String>(
                              value: todo['status'] as String? ?? 'pending',
                              items: const [
                                DropdownMenuItem(value: 'pending', child: Text('pending')),
                                DropdownMenuItem(value: 'in_progress', child: Text('in progress')),
                                DropdownMenuItem(value: 'completed', child: Text('completed')),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  _updateTodoStatus(todo['id'] as String, value);
                                }
                              },
                            ),
                          ),
                        )),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'Add Memory',
                      Column(
                        children: [
                          TextField(controller: _memoryTitle, decoration: const InputDecoration(labelText: 'Title')),
                          const SizedBox(height: 8),
                          TextField(controller: _memoryContent, maxLines: 4, decoration: const InputDecoration(labelText: 'Content')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _addMemory, child: const Text('Save memory')),
                          ),
                        ],
                      ),
                    ),
                    ..._memoryEntries.map((entry) => ListTile(title: Text(entry['title'] as String? ?? ''), subtitle: Text(entry['content'] as String? ?? ''))),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'Session Search',
                      Column(
                        children: [
                          TextField(controller: _searchQuery, decoration: const InputDecoration(labelText: 'Search query')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _searchSessions, child: const Text('Search')),
                          ),
                        ],
                      ),
                    ),
                    ..._searchResults.map((result) => ListTile(
                          title: Text(result['title'] as String? ?? ''),
                          subtitle: Text(
                            [
                              if ((result['summary'] as String? ?? '').isNotEmpty)
                                'Summary (${result['summarySource'] ?? 'derived'}): ${result['summary']}',
                              if ((result['preview'] as String? ?? '').isNotEmpty)
                                'Preview: ${result['preview']}',
                            ].join('\n\n'),
                          ),
                        )),
                    _card(
                      'Knowledge Engine',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_knowledgeStatus)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(onPressed: _queryKnowledge, child: const Text('Query QMD')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _knowledgeSourcePath,
                            decoration: const InputDecoration(labelText: 'Source path to ingest'),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _knowledgeSelector,
                            decoration: const InputDecoration(labelText: 'Document selector / docid'),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _knowledgeTitle,
                            decoration: const InputDecoration(labelText: 'Wiki page title'),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(onPressed: _initKnowledgeWiki, child: const Text('Init wiki')),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(onPressed: _ingestKnowledgeSource, child: const Text('Ingest source')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(onPressed: _getKnowledgeDocument, child: const Text('Get doc')),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(onPressed: _fileKnowledgeAnswer, child: const Text('File answer')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_knowledgeLint)),
                          const SizedBox(height: 8),
                          _knowledgeResultsView(),
                        ],
                      ),
                    ),
                    _card(
                      'Code Graph',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_codeGraphStatus)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(onPressed: _buildCodeGraph, child: const Text('Build graph')),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(onPressed: _queryCodeGraph, child: const Text('Query graph')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _graphNodeSelector,
                            decoration: const InputDecoration(labelText: 'Node selector'),
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: OutlinedButton(onPressed: _getCodeGraphNode, child: const Text('Get node')),
                          ),
                          const SizedBox(height: 8),
                          _codeGraphResultsView(),
                        ],
                      ),
                    ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'Automation',
                      Column(
                        children: [
                          TextField(controller: _automationTitle, decoration: const InputDecoration(labelText: 'Title')),
                          const SizedBox(height: 8),
                          TextField(controller: _automationPrompt, maxLines: 3, decoration: const InputDecoration(labelText: 'Prompt')),
                          const SizedBox(height: 8),
                          TextField(controller: _automationInterval, decoration: const InputDecoration(labelText: 'Interval minutes')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _createAutomation, child: const Text('Create')),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Background Job',
                      Column(
                        children: [
                          TextField(controller: _jobTitle, decoration: const InputDecoration(labelText: 'Title')),
                          const SizedBox(height: 8),
                          TextField(controller: _jobPrompt, maxLines: 3, decoration: const InputDecoration(labelText: 'Prompt')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _createBackgroundJob, child: const Text('Queue background job')),
                          ),
                        ],
                      ),
                    ),
                    ..._backgroundJobs.map((job) => ListTile(
                          title: Text(job['title'] as String? ?? ''),
                          subtitle: Text(job['status'] as String? ?? ''),
                          trailing: SizedBox(
                            width: 220,
                            child: Text(
                              job['result'] as String? ?? '',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )),
                    ..._automationJobs.map((job) => ListTile(
                          title: Text(job['title'] as String? ?? ''),
                          subtitle: Text('Every ${job['intervalMinutes']} minutes'),
                        )),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'MCP Import',
                      Column(
                        children: [
                          TextField(controller: _mcpWorkspace, decoration: const InputDecoration(labelText: 'Workspace path with .mcp.json')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _importMcp, child: const Text('Import workspace MCP')),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'External Config Import',
                      Column(
                        children: [
                          TextField(controller: _externalDetectRoot, decoration: const InputDecoration(labelText: 'Detect root path')),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: _detectExternalConfig,
                                  child: const Text('Detect'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _externalItems.isEmpty ? null : _importExternalConfig,
                                  child: const Text('Import detected'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ..._externalItems.map((item) => ListTile(
                                title: Text(item['itemType'] as String? ?? ''),
                                subtitle: Text(item['description'] as String? ?? ''),
                              )),
                        ],
                      ),
                    ),
                    ..._mcpServers.map((server) => Card(
                          child: ListTile(
                            title: Text(server['name'] as String? ?? ''),
                            subtitle: Text(server['status'] as String? ?? ''),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton(onPressed: () => _approveMcp(server['id'] as String, 'approved'), child: const Text('Approve')),
                                TextButton(onPressed: () => _approveMcp(server['id'] as String, 'rejected'), child: const Text('Reject')),
                              ],
                            ),
                          ),
                        )),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    _card(
                      'Operator Console',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              FilledButton(onPressed: _refreshAll, child: const Text('Refresh all')),
                              OutlinedButton(onPressed: _openConfigFormEditor, child: const Text('Edit config')),
                              OutlinedButton(onPressed: _openConfigSnapshotDialog, child: const Text('Config snapshot')),
                              OutlinedButton(
                                onPressed: () => _runDoctorRepair('apply_safe_security_defaults'),
                                child: const Text('Safe defaults'),
                              ),
                              OutlinedButton(
                                onPressed: _runDreamNow,
                                child: const Text('Dream now'),
                              ),
                              OutlinedButton(
                                onPressed: _runCompactionNow,
                                child: const Text('Compact now'),
                              ),
                              OutlinedButton(
                                onPressed: () => _launchUltraplan(),
                                child: const Text('Ultraplan'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _statusChip('Presence', _presenceActors.length.toString()),
                              _statusChip('Tasks', _taskRegistry.length.toString()),
                              _statusChip('Queue lanes', _fmtCount(_queueSummary, 'lanes')),
                              _statusChip('Plugins', _codexPlugins.length.toString()),
                              _statusChip('Knowledge', (_knowledgeStatus['available'] ?? false).toString()),
                              _statusChip('Budget', (_budget['estimatedUsd'] ?? 0).toString()),
                              _statusChip('Ultraplan', _ultraplanSessions.length.toString()),
                            ],
                          ),
                          const SizedBox(height: 8),
                          if (_recommendedActionButtons().isNotEmpty)
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _recommendedActionButtons(),
                            ),
                        ],
                      ),
                    ),
                    _card(
                      'Company',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(controller: _companyName, decoration: const InputDecoration(labelText: 'Company name')),
                          const SizedBox(height: 8),
                          TextField(controller: _companyMission, decoration: const InputDecoration(labelText: 'Mission')),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _companyDescription,
                            maxLines: 3,
                            decoration: const InputDecoration(labelText: 'Description'),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _saveCompanyProfile, child: const Text('Save company')),
                        ],
                      ),
                    ),
                    _card(
                      'Company Goals',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(controller: _goalTitle, decoration: const InputDecoration(labelText: 'Goal title')),
                          const SizedBox(height: 8),
                          TextField(controller: _goalDescription, decoration: const InputDecoration(labelText: 'Goal description')),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _createCompanyGoal, child: const Text('Add goal')),
                          const SizedBox(height: 8),
                          ..._companyGoals.take(8).map((goal) => ListTile(
                                dense: true,
                                title: Text(goal['title'] as String? ?? ''),
                                subtitle: Text('${goal['status'] ?? ''} · ${goal['description'] ?? ''}'),
                                trailing: DropdownButton<String>(
                                  value: goal['status'] as String? ?? 'planned',
                                  items: const [
                                    DropdownMenuItem(value: 'planned', child: Text('planned')),
                                    DropdownMenuItem(value: 'active', child: Text('active')),
                                    DropdownMenuItem(value: 'achieved', child: Text('achieved')),
                                    DropdownMenuItem(value: 'cancelled', child: Text('cancelled')),
                                  ],
                                  onChanged: (value) {
                                    if (value != null) {
                                      _updateCompanyGoalStatus(goal['id'] as String, value);
                                    }
                                  },
                                ),
                              )),
                        ],
                      ),
                    ),
                    _card(
                      'Assignees',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(controller: _assigneeName, decoration: const InputDecoration(labelText: 'Assignee name')),
                          const SizedBox(height: 8),
                          TextField(controller: _assigneeRole, decoration: const InputDecoration(labelText: 'Assignee role')),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _createCompanyAssignee, child: const Text('Add assignee')),
                          const SizedBox(height: 8),
                          ..._companyAssignees.take(8).map((assignee) => ListTile(
                                dense: true,
                                title: Text(assignee['name'] as String? ?? ''),
                                subtitle: Text('${assignee['role'] ?? ''} · ${assignee['status'] ?? ''}'),
                                trailing: DropdownButton<String>(
                                  value: assignee['status'] as String? ?? 'active',
                                  items: const [
                                    DropdownMenuItem(value: 'active', child: Text('active')),
                                    DropdownMenuItem(value: 'paused', child: Text('paused')),
                                    DropdownMenuItem(value: 'terminated', child: Text('terminated')),
                                  ],
                                  onChanged: (value) {
                                    if (value != null) {
                                      _updateCompanyAssigneeStatus(assignee['id'] as String, value);
                                    }
                                  },
                                ),
                              )),
                        ],
                      ),
                    ),
                    _card(
                      'Providers',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _providerCatalog.isEmpty
                            ? [const Text('No provider catalog entries')]
                            : _providerCatalog.take(8).map((entry) => ListTile(
                                  dense: true,
                                  title: Text(entry['displayName'] as String? ?? entry['id'] as String? ?? ''),
                                  subtitle: Text(
                                    [
                                      entry['type'] as String? ?? '',
                                      entry['defaultModel'] as String? ?? '',
                                      if (((entry['authEnvVars'] as List?) ?? const []).isNotEmpty)
                                        'env: ${((entry['authEnvVars'] as List?) ?? const []).join(", ")}',
                                    ].join(' · '),
                                  ),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Recipes',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _recipeValue,
                            decoration: const InputDecoration(labelText: 'Recipe parameter value'),
                          ),
                          const SizedBox(height: 8),
                          ...(_recipes.isEmpty
                              ? [const Text('No recipes configured')]
                              : _recipes.take(8).map((recipe) => ListTile(
                                    dense: true,
                                    title: Text(recipe['title'] as String? ?? ''),
                                    subtitle: Text(
                                      [
                                        recipe['description'] as String? ?? '',
                                        if (((recipe['activities'] as List?) ?? const []).isNotEmpty)
                                          'activities: ${((recipe['activities'] as List?) ?? const []).join(", ")}',
                                        if (((recipe['parameters'] as List?) ?? const []).isNotEmpty)
                                          'params: ${((recipe['parameters'] as List?) ?? const []).map((item) => (item as Map)['key']).join(", ")}',
                                      ].where((value) => value.trim().isNotEmpty).join('\n'),
                                    ),
                                    trailing: TextButton(
                                      onPressed: () => _runRecipe(recipe),
                                      child: const Text('Use'),
                                    ),
                                  ))),
                        ],
                      ),
                    ),
                    _card(
                      'Permissions',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _permissionRecords.isEmpty
                            ? [const Text('No stored permissions')]
                            : _permissionRecords.take(8).map((record) => ListTile(
                                  dense: true,
                                  title: Text(record['toolName'] as String? ?? ''),
                                  subtitle: Text(
                                    '${(record['allowed'] ?? false) == true ? 'allowed' : 'denied'} · ${record['readableContext'] ?? ''}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Distros',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _distros.isEmpty
                            ? [const Text('No distro profiles')]
                            : _distros.take(8).map((profile) => ListTile(
                                  dense: true,
                                  title: Text(profile['title'] as String? ?? profile['id'] as String? ?? ''),
                                  subtitle: Text(profile['description'] as String? ?? ''),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Health',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _statusChip('Health', _healthy ? 'ok' : 'down'),
                              _statusChip('Context', _contextEngineStatus['active']?.toString() ?? 'unknown'),
                              _statusChip('Queue queued', _fmtCount(_queueSummary, 'queued')),
                              _statusChip('Queue running', _fmtCount(_queueSummary, 'running')),
                              _statusChip('Doctor errors', _fmtCount(_doctor['summary'] as Map<String, dynamic>? ?? const {}, 'errors')),
                              _statusChip('Warnings', _fmtCount(_doctor['summary'] as Map<String, dynamic>? ?? const {}, 'warnings')),
                            ],
                          ),
                          const SizedBox(height: 8),
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_health)),
                          if (_threadStatus.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText('Thread status:\n${const JsonEncoder.withIndent('  ').convert(_threadStatus)}'),
                          ],
                          if (_tokenUsage.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText('Token usage:\n${const JsonEncoder.withIndent('  ').convert(_tokenUsage)}'),
                          ],
                          if (_rateLimits.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText('Rate limits:\n${const JsonEncoder.withIndent('  ').convert(_rateLimits)}'),
                          ],
                        ],
                      ),
                    ),
                    _card(
                      'Startup',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_startup)),
                          const SizedBox(height: 8),
                          DropdownButton<String>(
                            value: _startupConfig['mode'] as String? ?? 'default',
                            items: const [
                              DropdownMenuItem(value: 'default', child: Text('default')),
                              DropdownMenuItem(value: 'bare', child: Text('bare')),
                              DropdownMenuItem(value: 'autonomous', child: Text('autonomous')),
                            ],
                            onChanged: (value) {
                              if (value == null) return;
                              setState(() {
                                _startupConfig['mode'] = value;
                              });
                            },
                          ),
                          SwitchListTile(
                            value: _startupConfig['prewarmCodex'] as bool? ?? true,
                            onChanged: (value) => setState(() => _startupConfig['prewarmCodex'] = value),
                            title: const Text('Prewarm Codex'),
                          ),
                          SwitchListTile(
                            value: _startupConfig['enableAutomationLoop'] as bool? ?? true,
                            onChanged: (value) => setState(() => _startupConfig['enableAutomationLoop'] = value),
                            title: const Text('Enable automation loop'),
                          ),
                          SwitchListTile(
                            value: _startupConfig['enableKairosLoop'] as bool? ?? true,
                            onChanged: (value) => setState(() => _startupConfig['enableKairosLoop'] = value),
                            title: const Text('Enable Kairos loop'),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _saveStartupConfig, child: const Text('Save startup config')),
                        ],
                      ),
                    ),
                    _card(
                      'Marketplace',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_marketplace)),
                          if (((_marketplace['missingRuntimePluginDirs'] as List?) ?? const []).isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText(
                              'Missing runtime plugin dirs: ${((_marketplace['missingRuntimePluginDirs'] as List?) ?? const []).join(', ')}',
                            ),
                          ],
                          if (((_marketplace['unmanagedRuntimePlugins'] as List?) ?? const []).isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText(
                              'Unmanaged runtime plugins: ${((_marketplace['unmanagedRuntimePlugins'] as List?) ?? const []).join(', ')}',
                            ),
                          ],
                        ],
                      ),
                    ),
                    _card(
                      'Security',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_securityStatus)),
                          if (_securityFindings.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            ..._securityFindings.map((finding) => ListTile(
                                  dense: true,
                                  title: Text(finding['title'] as String? ?? ''),
                                  subtitle: Text('${finding['severity']}: ${finding['detail']}'),
                                )),
                          ],
                        ],
                      ),
                    ),
                    _card(
                      'OpenShell',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Available', (_openshellStatus['available'] ?? false).toString()),
                          _summaryPair('Sandbox', (_openshellStatus['sandboxName'] ?? '').toString()),
                          _summaryPair('Configured', (_openshellStatus['configured'] ?? false).toString()),
                          _summaryPair('Approved', (_openshellStatus['approved'] ?? false).toString()),
                          _summaryPair('Active', (_openshellStatus['active'] ?? false).toString()),
                          if (((_openshellStatus['detail'] ?? '').toString()).isNotEmpty)
                            _summaryPair('Detail', (_openshellStatus['detail'] ?? '').toString()),
                        ],
                      ),
                    ),
                    _card(
                      'Context Engine',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Active', (_contextEngineStatus['active'] ?? '').toString()),
                          _summaryPair('Resolved', (_contextEngineStatus['resolved'] ?? false).toString()),
                          _summaryPair(
                            'Available',
                            (((_contextEngineStatus['available'] as List?) ?? const [])
                                    .map((entry) => (entry as Map)['id']?.toString() ?? '')
                                    .where((value) => value.isNotEmpty)
                                    .join(', '))
                                .toString(),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Presence Summary',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _presenceActors.isEmpty
                            ? [const Text('No presence actors yet')]
                            : _presenceActors.take(8).map((actor) => ListTile(
                                  dense: true,
                                  title: Text(actor['label'] as String? ?? ''),
                                  subtitle: Text(_presenceSummary(actor)),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Presence',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _presenceActors.isEmpty
                            ? [const Text('No presence actors yet')]
                            : _presenceActors.take(12).map((actor) => ListTile(
                                  dense: true,
                                  title: Text(actor['label'] as String? ?? ''),
                                  subtitle: Text('${actor['kind']} · ${actor['mode'] ?? ''} · ${actor['lastSeenAt'] ?? ''}'),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Doctor',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Errors', _fmtCount(_doctor['summary'] as Map<String, dynamic>? ?? const {}, 'errors')),
                          _summaryPair('Warnings', _fmtCount(_doctor['summary'] as Map<String, dynamic>? ?? const {}, 'warnings')),
                          _summaryPair('Infos', _fmtCount(_doctor['summary'] as Map<String, dynamic>? ?? const {}, 'infos')),
                          if (((_doctor['findings'] as List?) ?? const []).isNotEmpty) ...[
                            const SizedBox(height: 8),
                            ...List<Map<String, dynamic>>.from(_doctor['findings'] as List? ?? const []).take(8).map(
                              (finding) => ListTile(
                                dense: true,
                                title: Text(finding['title'] as String? ?? ''),
                                subtitle: Text(finding['detail'] as String? ?? ''),
                                trailing: (finding['repairAction'] as String?)?.isNotEmpty == true
                                    ? TextButton(
                                        onPressed: () => _runDoctorRepair(finding['repairAction'] as String),
                                        child: const Text('Repair'),
                                      )
                                    : null,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    _card(
                      'Config Schema',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_configSchema)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(onPressed: _openConfigEditor, child: const Text('Edit as JSON')),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton(onPressed: _openConfigFormEditor, child: const Text('Edit as form')),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Workflow Controls',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _workflowMissions.isEmpty
                            ? [const Text('No workflow missions available')]
                            : _workflowMissions.take(8).map((mission) => ListTile(
                                  dense: true,
                                  title: Text(mission['title'] as String? ?? ''),
                                  subtitle: Text('${mission['workflowId'] ?? ''} · ${mission['status'] ?? ''}'),
                                  trailing: DropdownButton<String>(
                                    value: mission['status'] as String? ?? 'queued',
                                    items: const [
                                      DropdownMenuItem(value: 'queued', child: Text('queued')),
                                      DropdownMenuItem(value: 'running', child: Text('running')),
                                      DropdownMenuItem(value: 'blocked', child: Text('blocked')),
                                      DropdownMenuItem(value: 'completed', child: Text('completed')),
                                      DropdownMenuItem(value: 'failed', child: Text('failed')),
                                      DropdownMenuItem(value: 'cancelled', child: Text('cancelled')),
                                    ],
                                    onChanged: (value) {
                                      if (value != null) {
                                        _updateWorkflowMissionStatus(mission['id'] as String, value);
                                      }
                                    },
                                  ),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Queue Controls',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _queueEntries.isEmpty
                            ? [const Text('No queue entries available')]
                            : _queueEntries.take(8).map((entry) => ListTile(
                                  dense: true,
                                  title: Text(entry['title'] as String? ?? ''),
                                  subtitle: Text('${entry['lane'] ?? ''} · ${entry['mode'] ?? ''} · ${entry['status'] ?? ''}'),
                                  trailing: DropdownButton<String>(
                                    value: entry['status'] as String? ?? 'queued',
                                    items: const [
                                      DropdownMenuItem(value: 'queued', child: Text('queued')),
                                      DropdownMenuItem(value: 'running', child: Text('running')),
                                      DropdownMenuItem(value: 'blocked', child: Text('blocked')),
                                      DropdownMenuItem(value: 'completed', child: Text('completed')),
                                      DropdownMenuItem(value: 'failed', child: Text('failed')),
                                      DropdownMenuItem(value: 'cancelled', child: Text('cancelled')),
                                    ],
                                    onChanged: (value) {
                                      if (value != null) {
                                        _updateQueueStatus(entry['id'] as String, value);
                                      }
                                    },
                                  ),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Ultraplan',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _ultraplanSessions.isEmpty
                            ? [const Text('No ultraplan sessions')]
                            : _ultraplanSessions.take(6).map((session) => Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    ListTile(
                                      dense: true,
                                      title: Text((session['launchText'] as String? ?? '').isEmpty
                                          ? 'Ultraplan session'
                                          : session['launchText'] as String),
                                      subtitle: Text(
                                        [
                                          session['phase'] as String? ?? '',
                                          if ((session['remoteThreadId'] as String? ?? '').isNotEmpty)
                                            'thread: ${session['remoteThreadId']}',
                                          if ((session['error'] as String? ?? '').isNotEmpty) session['error'] as String,
                                        ].join(' · '),
                                      ),
                                    ),
                                    if ((session['pendingInput'] as String? ?? '').isNotEmpty) ...[
                                      SelectableText(session['pendingInput'] as String),
                                      const SizedBox(height: 8),
                                      TextField(
                                        controller: _ultraplanReply,
                                        maxLines: 4,
                                        decoration: const InputDecoration(labelText: 'Ultraplan reply'),
                                      ),
                                      const SizedBox(height: 8),
                                      FilledButton(
                                        onPressed: () => _respondUltraplan(session['id'] as String),
                                        child: const Text('Send reply'),
                                      ),
                                    ],
                                    if ((session['plan'] as String? ?? '').isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      SelectableText(session['plan'] as String),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          OutlinedButton(
                                            onPressed: () => _handoffUltraplan(session['id'] as String, 'send_back_local'),
                                            child: const Text('Send back local'),
                                          ),
                                          OutlinedButton(
                                            onPressed: () => _handoffUltraplan(session['id'] as String, 'continue_remote'),
                                            child: const Text('Continue remote'),
                                          ),
                                        ],
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    OutlinedButton(
                                      onPressed: () => _stopUltraplan(session['id'] as String),
                                      child: const Text('Stop'),
                                    ),
                                    const Divider(),
                                  ],
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Workflow Summary',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _workflowMissions.isEmpty
                            ? [const Text('No workflow missions available')]
                            : _workflowMissions.take(8).map((mission) => ListTile(
                                  dense: true,
                                  title: Text(mission['title'] as String? ?? ''),
                                  subtitle: Text(_workflowControlSubtitle(mission)),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Queue Summary Details',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _queueEntries.isEmpty
                            ? [const Text('No queue entries available')]
                            : _queueEntries.take(8).map((entry) => ListTile(
                                  dense: true,
                                  title: Text(entry['title'] as String? ?? ''),
                                  subtitle: Text(_queueControlSubtitle(entry)),
                                )).toList(),
                      ),
                    ),
                    _card(
                      'Codex Bridge',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Started', (_codexBridgeStatus['started'] ?? false).toString()),
                          _summaryPair('Initialized', (_codexBridgeStatus['initialized'] ?? false).toString()),
                          _summaryPair('Pending requests', (_codexBridgeStatus['pendingRequests'] ?? 0).toString()),
                          _summaryPair('Requests sent', (_codexBridgeStatus['requestsSent'] ?? 0).toString()),
                          if (((_codexBridgeStatus['lastError'] ?? '').toString()).isNotEmpty)
                            _summaryPair('Last error', (_codexBridgeStatus['lastError'] ?? '').toString()),
                        ],
                      ),
                    ),
                    _card(
                      'Telemetry',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Input tokens', (_telemetry['totalInputTokens'] ?? 0).toString()),
                          _summaryPair('Output tokens', (_telemetry['totalOutputTokens'] ?? 0).toString()),
                          _summaryPair('Estimated USD', (_telemetry['estimatedUsd'] ?? 0).toString()),
                        ],
                      ),
                    ),
                    _card(
                      'Budget',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _summaryPair('Enabled', (_budget['enabled'] ?? false).toString()),
                          _summaryPair('Estimated USD', (_budget['estimatedUsd'] ?? 0).toString()),
                          _summaryPair('Limit', (_budget['monthlyUsdLimit'] ?? 0).toString()),
                          _summaryPair('Alert threshold', (_budget['alertThresholdUsd'] ?? 0).toString()),
                          _summaryPair('Hard stop', (_budget['hardStop'] ?? false).toString()),
                          if ((_budget['nearLimit'] ?? false) == true)
                            const Text('Budget threshold reached', style: TextStyle(color: Colors.orange)),
                          if ((_budget['overLimit'] ?? false) == true)
                            const Text('Budget limit exceeded', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                    _card(
                      'Workflow Presets',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _workflowPresets.isEmpty
                            ? [const Text('No workflow presets loaded')]
                            : _workflowPresets
                                .map((preset) => ListTile(
                                      title: Text(preset['title'] as String? ?? ''),
                                      subtitle: Text(preset['description'] as String? ?? ''),
                                      trailing: TextButton(
                                        onPressed: () => _runWorkflowPreset(preset),
                                        child: const Text('Use'),
                                      ),
                                      dense: true,
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Workflow Missions',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _workflowMissions.isEmpty
                            ? [const Text('No workflow missions yet')]
                            : _workflowMissions
                                .take(10)
                                .map((mission) => ListTile(
                                      title: Text(mission['title'] as String? ?? ''),
                                      subtitle: Text('${mission['workflowId']} · ${mission['status']}'),
                                      dense: true,
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Unified Tasks',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_taskRegistrySummary)),
                          const SizedBox(height: 8),
                          ..._taskRegistry.take(12).map((task) => ListTile(
                                dense: true,
                                title: Text(task['title'] as String? ?? ''),
                                subtitle: Text('${task['kind']} · ${task['status']}\n${task['detail'] ?? ''}'),
                              )),
                        ],
                      ),
                    ),
                    _card(
                      'Run Queue',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_queueSummary)),
                          const SizedBox(height: 8),
                          ..._queueEntries.take(12).map((entry) => ListTile(
                                dense: true,
                                title: Text(entry['title'] as String? ?? ''),
                                subtitle: Text('${entry['lane']} · ${entry['mode']} · ${entry['status']}'),
                              )),
                        ],
                      ),
                    ),
                    _card(
                      'Notification Routes',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _notificationRoutes.isEmpty
                            ? [const Text('No notification routes configured')]
                            : _notificationRoutes
                                .map((route) => ListTile(
                                      title: Text(route['title'] as String? ?? ''),
                                      subtitle: Text(
                                        '${route['eventPrefix']} -> ${route['channel']} (${route['enabled'] == true ? 'enabled' : 'disabled'})',
                                      ),
                                      dense: true,
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Notification Deliveries',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _notificationDeliveries.isEmpty
                            ? [const Text('No notification deliveries yet')]
                            : _notificationDeliveries
                                .take(12)
                                .map((delivery) => ListTile(
                                      title: Text(delivery['eventName'] as String? ?? ''),
                                      subtitle: Text('${delivery['status']} · ${delivery['detail']}'),
                                      dense: true,
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Runtime Profiles',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (((_runtimeProfiles['profiles'] as Map?) ?? const {}).isNotEmpty)
                            DropdownButton<String>(
                              value: _runtimeProfiles['active'] as String?,
                              items: ((Map<String, dynamic>.from(_runtimeProfiles['profiles'] as Map? ?? const {})).keys)
                                  .map((name) => DropdownMenuItem(value: name, child: Text(name)))
                                  .toList(),
                              onChanged: (value) {
                                if (value == null) return;
                                setState(() {
                                  _runtimeProfiles['active'] = value;
                                });
                              },
                            )
                          else
                            const Text('No runtime profiles loaded'),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _saveRuntimeProfiles, child: const Text('Save runtime profile')),
                          const SizedBox(height: 8),
                          ...Map<String, dynamic>.from(_runtimeProfiles['profiles'] as Map? ?? const {}).entries.map(
                            (entry) => ListTile(
                              title: Text(entry.key),
                              subtitle: Text(
                                'backend: ${entry.value['backend'] ?? ''}\n'
                                'cwd: ${entry.value['cwd'] ?? ''}\n'
                                'timeout: ${entry.value['timeoutSeconds'] ?? ''}s\n'
                                'configured: ${entry.value['configured'] ?? false} · approved: ${entry.value['approved'] ?? false} · active: ${entry.value['active'] ?? false}\n'
                                '${entry.value['backend'] == 'openshell' ? 'sandbox: ${((entry.value['openshellProfile'] as Map?)?['sandboxName'] ?? '')}\npolicy: ${((entry.value['openshellProfile'] as Map?)?['policyPath'] ?? '')}\n' : ''}'
                                '${entry.value['notes'] ?? ''}',
                              ),
                              dense: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Toolset Profiles',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (((_toolsets['profiles'] as Map?) ?? const {}).isNotEmpty)
                            DropdownButton<String>(
                              value: _toolsets['active'] as String?,
                              items: ((Map<String, dynamic>.from(_toolsets['profiles'] as Map? ?? const {})).keys)
                                  .map((name) => DropdownMenuItem(value: name, child: Text(name)))
                                  .toList(),
                              onChanged: (value) {
                                if (value == null) return;
                                setState(() {
                                  _toolsets['active'] = value;
                                });
                              },
                            )
                          else
                            const Text('No toolset profiles loaded'),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _saveToolsets, child: const Text('Save toolset profile')),
                          const SizedBox(height: 8),
                          ...Map<String, dynamic>.from(_toolsets['profiles'] as Map? ?? const {}).entries.map(
                            (entry) => ListTile(
                              title: Text(entry.key),
                              subtitle: Text(
                                '${entry.value['description'] ?? ''}\n'
                                'tools: ${((entry.value['tools'] as List?) ?? const []).join(', ')}',
                              ),
                              dense: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Skills Hub',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _externalSkillRoots,
                            maxLines: 4,
                            decoration: const InputDecoration(
                              labelText: 'External skill roots (one per line)',
                            ),
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _saveSkillsHub, child: const Text('Save skill roots')),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Project: ${((_skillsHub['projectSkills'] as List?) ?? const []).length}  '
                            'Learned: ${((_skillsHub['learnedSkills'] as List?) ?? const []).length}  '
                            'Imported: ${((_skillsHub['importedSkills'] as List?) ?? const []).length}  '
                            'External: ${((_skillsHub['externalSkills'] as List?) ?? const []).length}',
                          ),
                          const SizedBox(height: 8),
                          ...List<Map<String, dynamic>>.from(_skillsHub['externalSkills'] as List? ?? const []).map(
                            (skill) => ListTile(
                              title: Text(skill['name'] as String? ?? ''),
                              subtitle: Text(skill['description'] as String? ?? skill['path'] as String? ?? ''),
                              trailing: TextButton(
                                onPressed: () => _importHubSkill(skill['path'] as String? ?? ''),
                                child: const Text('Import'),
                              ),
                              dense: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Provider Routing',
                      Column(
                        children: [
                          TextField(controller: _primaryModel, decoration: const InputDecoration(labelText: 'Primary model')),
                          const SizedBox(height: 8),
                          TextField(controller: _fastModel, decoration: const InputDecoration(labelText: 'Fast model')),
                          const SizedBox(height: 8),
                          TextField(controller: _researcherModel, decoration: const InputDecoration(labelText: 'Researcher model')),
                          const SizedBox(height: 8),
                          TextField(controller: _writerModel, decoration: const InputDecoration(labelText: 'Writer model')),
                          const SizedBox(height: 8),
                          TextField(controller: _reviewerModel, decoration: const InputDecoration(labelText: 'Reviewer model')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _saveRouting, child: const Text('Save routing')),
                          ),
                          const SizedBox(height: 8),
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_routing)),
                        ],
                      ),
                    ),
                    _card(
                      'Codex Models',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _codexModels.isEmpty
                            ? [const Text('No model data')]
                            : _codexModels
                                .map((model) => ListTile(
                                      title: Text(model['displayName'] as String? ?? model['id'] as String? ?? ''),
                                      subtitle: Text(model['description'] as String? ?? ''),
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Codex Plugins',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _codexPlugins.isEmpty
                            ? [const Text('No plugin data')]
                            : _codexPlugins
                                .map((plugin) => ListTile(
                                      title: Text(plugin['name'] as String? ?? ''),
                                      subtitle: Text(plugin['id'] as String? ?? ''),
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Codex Skills',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _codexSkills.isEmpty
                            ? [const Text('No skill data')]
                            : _codexSkills
                                .map((skill) => ListTile(
                                      title: Text(skill['name'] as String? ?? ''),
                                      subtitle: Text(skill['description'] as String? ?? ''),
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Evolution',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_evolution)),
                          const SizedBox(height: 8),
                          SwitchListTile(
                            value: _evolutionPolicy['enabled'] as bool? ?? true,
                            onChanged: (value) => setState(() => _evolutionPolicy['enabled'] = value),
                            title: const Text('Evolution enabled'),
                          ),
                          SwitchListTile(
                            value: _evolutionPolicy['autoLearn'] as bool? ?? true,
                            onChanged: (value) => setState(() => _evolutionPolicy['autoLearn'] = value),
                            title: const Text('Auto learn from sessions'),
                          ),
                          TextField(
                            decoration: const InputDecoration(labelText: 'Minimum messages before learning'),
                            controller: TextEditingController(
                              text: (_evolutionPolicy['minMessages'] ?? 2).toString(),
                            ),
                            onChanged: (value) => _evolutionPolicy['minMessages'] = int.tryParse(value) ?? 2,
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _evolutionTags,
                            decoration: const InputDecoration(labelText: 'Evolution tags (comma separated)'),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _saveEvolutionPolicy, child: const Text('Save evolution policy')),
                          const SizedBox(height: 8),
                          FilledButton(onPressed: _runEvolutionNow, child: const Text('Run evolution now')),
                          const SizedBox(height: 8),
                          OutlinedButton(onPressed: _runDreamNow, child: const Text('Run dream reflection')),
                          const SizedBox(height: 8),
                          OutlinedButton(onPressed: _runCompactionNow, child: const Text('Run compaction')),
                          const SizedBox(height: 8),
                          OutlinedButton(
                            onPressed: _rpcReady && _sessionId != null ? _runReviewNow : null,
                            child: const Text('Run review'),
                          ),
                        ],
                      ),
                    ),
                    _card(
                      'Learned Skills',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _learnedSkills.isEmpty
                            ? [const Text('No learned skills yet')]
                            : _learnedSkills
                                .map((skill) => Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  SelectableText(skill['slug'] as String? ?? ''),
                                                  const SizedBox(width: 8),
                                                  if (skill['pinned'] == true) const Chip(label: Text('Pinned')),
                                                  if ((skill['size'] as int? ?? 0) > 0) ...[
                                                    const SizedBox(width: 8),
                                                    Text('${skill['size']} chars'),
                                                  ],
                                                ],
                                              ),
                                              if ((skill['preview'] as String? ?? '').isNotEmpty)
                                                Text(
                                                  skill['preview'] as String,
                                                  maxLines: 4,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                            ],
                                          ),
                                        ),
                                        TextButton(
                                          onPressed: () => _pinLearnedSkill(
                                            skill['slug'] as String,
                                            !(skill['pinned'] as bool? ?? false),
                                          ),
                                          child: Text((skill['pinned'] as bool? ?? false) ? 'Unpin' : 'Pin'),
                                        ),
                                        TextButton(
                                          onPressed: () => _deleteLearnedSkill(skill['slug'] as String),
                                          child: const Text('Delete'),
                                        ),
                                      ],
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Environment Snapshot',
                      SelectableText(const JsonEncoder.withIndent('  ').convert(_environmentSnapshot)),
                    ),
                    _card(
                      'Workspace Summary',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(const JsonEncoder.withIndent('  ').convert(_workspaceSummary)),
                          const SizedBox(height: 8),
                          SelectableText('Workspace safety:\n${const JsonEncoder.withIndent('  ').convert(_workspaceSafety)}'),
                        ],
                      ),
                    ),
                    _card(
                      'Compaction',
                      SelectableText(const JsonEncoder.withIndent('  ').convert(_compaction)),
                    ),
                    _card(
                      'Dream Reports',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _dreamReports.isEmpty
                            ? [const Text('No dream reports yet')]
                            : _dreamReports
                                .map((report) => ListTile(
                                      title: Text(report['title'] as String? ?? ''),
                                      subtitle: Text(report['summary'] as String? ?? ''),
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Kairos Signals',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: _kairosSignals.isEmpty
                            ? [const Text('No kairos signals yet')]
                            : _kairosSignals
                                .map((signal) => ListTile(
                                      title: Text(signal['title'] as String? ?? ''),
                                      subtitle: Text(signal['detail'] as String? ?? ''),
                                    ))
                                .toList(),
                      ),
                    ),
                    _card(
                      'Artifacts',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ..._artifacts.map((artifact) => SelectableText(artifact)),
                          ..._artifactRows.map((artifact) => SelectableText(
                                '${artifact['sessionId']}/${artifact['fileName']}',
                              )),
                        ],
                      ),
                    ),
                    _card(
                      'Export State',
                      Column(
                        children: [
                          TextField(controller: _exportName, decoration: const InputDecoration(labelText: 'Export file name')),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(onPressed: _exportState, child: const Text('Export')),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('__AGENT_NAME__'),
        actions: [
          Icon(_healthy ? Icons.cloud_done_outlined : Icons.cloud_off_outlined),
          TextButton(onPressed: _refreshAll, child: const Text('Refresh')),
          TextButton(onPressed: _openSettings, child: const Text('Settings')),
          if (!kIsWeb) TextButton(onPressed: _startLocalCore, child: const Text('Start local core')),
          if (!_localMode)
            TextButton(
              onPressed: () async {
                _authToken = null;
                _localMode = true;
                await _saveSettings();
                setState(() {});
              },
              child: const Text('Sign out'),
            ),
        ],
      ),
      body: isWide
          ? Row(
              children: [
                sessionsPane,
                Expanded(child: chatPane),
                SizedBox(width: 420, child: operationsPane),
              ],
            )
          : Column(
              children: [
                Expanded(child: chatPane),
                SizedBox(height: 360, child: operationsPane),
              ],
            ),
    );
  }
}

class SettingsModel {
  const SettingsModel({
    required this.backendUrl,
    required this.workspacePath,
    required this.localCoreWorkingDirectory,
    required this.localCoreCommand,
    required this.enableSubagents,
    required this.authToken,
  });

  final String backendUrl;
  final String workspacePath;
  final String localCoreWorkingDirectory;
  final String localCoreCommand;
  final bool enableSubagents;
  final String authToken;

  static SettingsModel defaults() => const SettingsModel(
        backendUrl: String.fromEnvironment(
          'DEFAULT_BACKEND_URL',
          defaultValue: 'http://127.0.0.1:__BACKEND_PORT__',
        ),
        workspacePath: '',
        localCoreWorkingDirectory: '..',
        localCoreCommand: 'npm run dev:core',
        enableSubagents: true,
        authToken: '',
      );

  static Future<SettingsModel> load() async {
    final prefs = await SharedPreferences.getInstance();
    return SettingsModel(
      backendUrl: prefs.getString('backendUrl') ?? defaults().backendUrl,
      workspacePath: prefs.getString('workspacePath') ?? defaults().workspacePath,
      localCoreWorkingDirectory: prefs.getString('localCoreWorkingDirectory') ?? defaults().localCoreWorkingDirectory,
      localCoreCommand: prefs.getString('localCoreCommand') ?? defaults().localCoreCommand,
      enableSubagents: prefs.getBool('enableSubagents') ?? true,
      authToken: prefs.getString('authToken') ?? '',
    );
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backendUrl', backendUrl);
    await prefs.setString('workspacePath', workspacePath);
    await prefs.setString('localCoreWorkingDirectory', localCoreWorkingDirectory);
    await prefs.setString('localCoreCommand', localCoreCommand);
    await prefs.setBool('enableSubagents', enableSubagents);
    await prefs.setString('authToken', authToken);
  }
}
