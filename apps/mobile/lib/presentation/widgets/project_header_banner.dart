import 'dart:convert';
import 'package:flutter/material.dart';
import '../../data/repositories/project_service.dart';
import '../../data/sources/api_config.dart';

class ProjectHeaderBanner extends StatefulWidget {
  final ProjectItem? currentProject;
  final List<ProjectItem>? allProjects;
  final ValueChanged<ProjectItem>? onProjectChanged;
  final bool compact;

  const ProjectHeaderBanner({
    super.key,
    this.currentProject,
    this.allProjects,
    this.onProjectChanged,
    this.compact = false,
  });

  @override
  State<ProjectHeaderBanner> createState() => _ProjectHeaderBannerState();
}

class _ProjectHeaderBannerState extends State<ProjectHeaderBanner> {
  ProjectItem? _current;
  List<ProjectItem> _projects = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _current = widget.currentProject;
    _projects = widget.allProjects ?? [];
    if (_current == null || _projects.isEmpty) {
      _loadProjects();
    }
  }

  @override
  void didUpdateWidget(covariant ProjectHeaderBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentProject != null) {
      _current = widget.currentProject;
    }
    if (widget.allProjects != null) {
      _projects = widget.allProjects!;
    }
  }

  Future<void> _loadProjects() async {
    setState(() => _loading = true);
    try {
      // 1. Obtener proyecto activo guardado en cache
      final savedInfo = await ApiConfig.instance.getActiveProjectInfo();
      _current ??= ProjectItem(
        id: savedInfo['id'] ?? ApiConfig.defaultProjectId,
        nombre: savedInfo['nombre'] ?? 'Proyecto Tecnogam',
        cliente: savedInfo['cliente'] ?? 'Cliente Tecnogam',
        logoCliente: savedInfo['logoCliente'],
      );

      // 2. Cargar lista remota/cache de proyectos
      final list = await ProjectService.instance.getProjects();
      if (mounted) {
        setState(() {
          _projects = list;
          if (_projects.isNotEmpty) {
            if (_current == null) {
              _current = _projects.first;
              ApiConfig.instance.setActiveProjectInfo(
                id: _current!.id,
                nombre: _current!.nombre,
                cliente: _current!.cliente,
                logoCliente: _current!.logoCliente,
              );
            } else {
              // Sincronizar info actualizada por si cambió el logo del cliente
              final match = _projects.firstWhere(
                (p) => p.id == _current!.id,
                orElse: () => _current!,
              );
              _current = match;
            }
          }
        });
      }
    } catch (_) {
      // Usar defaults si falla red
      if (_current == null && mounted) {
        setState(() {
          _current = ProjectItem(
            id: ApiConfig.defaultProjectId,
            nombre: 'Control Tecnogam Industrial',
            cliente: 'Tecnogam Operaciones',
          );
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showProjectPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Seleccionar Proyecto Activo',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1C1C1A)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Tus reportes y avances se vincularán al proyecto seleccionado:',
                style: TextStyle(fontSize: 12, color: Color(0xFF5F5E5A)),
              ),
              const SizedBox(height: 16),
              if (_projects.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20.0),
                    child: Text('No hay proyectos disponibles en línea ni en caché.', style: TextStyle(color: Color(0xFF5F5E5A))),
                  ),
                )
              else
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _projects.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFE3E1D9)),
                    itemBuilder: (context, index) {
                      final p = _projects[index];
                      final isSelected = _current?.id == p.id;
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                        leading: _buildClientLogoWidget(p.logoCliente, p.cliente, size: 40),
                        title: Text(
                          p.nombre,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            color: const Color(0xFF1C1C1A),
                          ),
                        ),
                        subtitle: Text(
                          'Cliente: ${p.cliente}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF5F5E5A)),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: Color(0xFF27500A))
                            : const Icon(Icons.chevron_right, color: Color(0xFF8B8A84), size: 20),
                        onTap: () async {
                          setState(() {
                            _current = p;
                          });
                          await ApiConfig.instance.setActiveProjectInfo(
                            id: p.id,
                            nombre: p.nombre,
                            cliente: p.cliente,
                            logoCliente: p.logoCliente,
                          );
                          widget.onProjectChanged?.call(p);
                          if (ctx.mounted) {
                            Navigator.of(ctx).pop();
                          }
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildClientLogoWidget(String? logoUrl, String cliente, {double size = 36}) {
    if (logoUrl != null && logoUrl.trim().isNotEmpty) {
      if (logoUrl.startsWith('data:image')) {
        try {
          final commaIdx = logoUrl.indexOf(',');
          if (commaIdx != -1) {
            final base64Str = logoUrl.substring(commaIdx + 1);
            final bytes = base64Decode(base64Str);
            return Container(
              width: size,
              height: size,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE3E1D9), width: 0.8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.memory(bytes, fit: BoxFit.contain),
              ),
            );
          }
        } catch (_) {}
      }

      return Container(
        width: size,
        height: size,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE3E1D9), width: 0.8),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Image.network(
            logoUrl,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => _buildFallbackClientBadge(cliente, size),
          ),
        ),
      );
    }
    return _buildFallbackClientBadge(cliente, size);
  }

  Widget _buildFallbackClientBadge(String cliente, double size) {
    final initials = cliente.isNotEmpty
        ? cliente.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
        : 'CL';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFF1EFE8),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE3E1D9), width: 0.8),
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            fontSize: size * 0.35,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF5F5E5A),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final projectName = _current?.nombre ?? (_loading ? 'Cargando Proyecto...' : 'Seleccionar Proyecto');
    final clientName = _current?.cliente ?? 'Tecnogam';
    final logoCliente = _current?.logoCliente;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: widget.compact ? 10 : 14, vertical: widget.compact ? 8 : 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE3E1D9), width: 0.8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // 1. Logo Tecnogam
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE3E1D9), width: 0.5),
            ),
            child: Image.asset(
              'assets/images/TG.png',
              height: widget.compact ? 22 : 28,
              width: widget.compact ? 28 : 34,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Icon(
                Icons.business,
                color: const Color(0xFF0C447C),
                size: widget.compact ? 20 : 24,
              ),
            ),
          ),
          const SizedBox(width: 10),

          // 2. Información del Proyecto y Selector
          Expanded(
            child: InkWell(
              onTap: () => _showProjectPicker(context),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            projectName,
                            style: TextStyle(
                              fontSize: widget.compact ? 12 : 13,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1C1C1A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.swap_horiz, size: 14, color: Color(0xFF0C447C)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Cliente: $clientName',
                      style: TextStyle(fontSize: widget.compact ? 10 : 11, color: const Color(0xFF5F5E5A)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 3. Logo de la Empresa Cliente
          _buildClientLogoWidget(logoCliente, clientName, size: widget.compact ? 28 : 34),
        ],
      ),
    );
  }
}
