class Customer {
  final String id;
  final String name;
  final String email;
  final double previousBalance;

  Customer({
    String? id,
    this.name = '',
    this.email = '',
    this.previousBalance = 0.0,
  }) : id = id ?? DateTime.now().millisecondsSinceEpoch.toString();

  Customer copyWith({
    String? id,
    String? name,
    String? email,
    double? previousBalance,
  }) {
    return Customer(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      previousBalance: previousBalance ?? this.previousBalance,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'previousBalance': previousBalance,
    };
  }

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String?,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      previousBalance: (json['previousBalance'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
