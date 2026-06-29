Feature: Additively import recipes
  As someone growing and curating my own collection
  I want an import to add to and refresh my recipes by default, without wiping them
  So that I can re-expand the collection (e.g. the full variant set) and keep my curation

  Background:
    Given the app starts with no recipes

  Scenario: Additive import keeps recipes the file doesn't mention
    Given I have imported recipes "r1, r2, r3"
    When I additively import recipes "r2, r4"
    Then the app holds recipes "r1, r2, r3, r4"

  Scenario: Additive import refreshes an existing recipe in place
    Given I have imported a recipe "r1" titled "Old Title"
    When I additively import a recipe "r1" titled "New Title"
    Then recipe "r1" is titled "New Title"
    And the app holds 1 recipe

  Scenario: Additive import leaves my stars untouched
    Given I have imported recipes "r1, r2"
    And I have rated recipe "r1" 5 stars
    When I additively import recipes "r2, r3"
    Then recipe "r1" still has 5 stars
    And the app holds recipes "r1, r2, r3"

  Scenario: A first import over the demo set does not keep demo recipes
    Given the store holds demo recipes "d1, d2"
    When I additively import recipes "r1, r2"
    Then the app holds recipes "r1, r2"
    And the data source is marked as user-owned
