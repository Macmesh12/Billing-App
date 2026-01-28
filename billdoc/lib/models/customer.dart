class Customer {
  final String id;
  final String name;
  final String email;

  Customer({
    String? id,
    this.name = '',
    this.email = '',
  }) : id = id ?? DateTime.now().millisecondsSinceEpoch.toString();

  Customer copyWith({
    String? id,
    String? name,
    String? email,
  }) {
    return Customer(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
    };
  }

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String?,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
    );
  }
}
